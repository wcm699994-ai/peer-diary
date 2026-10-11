// Dexie（IndexedDB）数据层。所有日记内容与 AI 分析字段都经 AES-GCM 加密后入库；
// 解密后的明文只存在于调用方内存中。

import Dexie, { type Table } from 'dexie';
import { deriveKey, fromBase64, randomSalt, seal, toBase64, unseal, PBKDF2_ITERATIONS } from './crypto';
import type { BackupFile, DiaryAnalysis, DiaryEntry } from '../types';

interface EncRow {
  entry_date: string;
  blob: string;
  created_at: string;
  updated_at: string;
}

interface DraftRow {
  entry_date: string;
  blob: string;
  updated_at: string;
}

interface MetaRow {
  key: string;
  value: string;
}

export const DB_NAME = 'peer-diary-web';

class PeerDiaryDB extends Dexie {
  entries!: Table<EncRow, string>;
  analysis!: Table<EncRow, string>;
  drafts!: Table<DraftRow, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      entries: 'entry_date',
      analysis: 'entry_date',
      drafts: 'entry_date',
      meta: 'key',
    });
  }
}

export const db = new PeerDiaryDB();

const nowIso = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// meta

export async function getMeta(key: string): Promise<string | undefined> {
  const row = await db.meta.get(key);
  return row?.value;
}

// ---------------------------------------------------------------------------
// PIN 锁

export interface LockMeta {
  salt: string;
  verifier: string;
  iterations: number;
}

const VERIFIER_CHECK = 'peer-diary';

export async function readLockMeta(): Promise<LockMeta | null> {
  const [salt, verifier, iterations] = await Promise.all([
    getMeta('pin_salt'),
    getMeta('pin_verifier'),
    getMeta('pin_iterations'),
  ]);
  if (!salt || !verifier) return null;
  return { salt, verifier, iterations: Number(iterations) || PBKDF2_ITERATIONS };
}

/** 首次设置 PIN：生成盐、派生密钥、写入验证器。 */
export async function createLock(pin: string): Promise<CryptoKey> {
  const salt = randomSalt();
  const key = await deriveKey(pin, salt);
  const verifier = await seal(key, { check: VERIFIER_CHECK });
  await db.meta.bulkPut([
    { key: 'pin_salt', value: toBase64(salt) },
    { key: 'pin_verifier', value: verifier },
    { key: 'pin_iterations', value: String(PBKDF2_ITERATIONS) },
    { key: 'created_at', value: nowIso() },
  ]);
  return key;
}

export async function verifyPin(pin: string): Promise<CryptoKey> {
  const meta = await readLockMeta();
  if (!meta) throw new Error('尚未设置 PIN');
  const key = await deriveKey(pin, fromBase64(meta.salt), meta.iterations);
  try {
    const value = await unseal<{ check: string }>(key, meta.verifier);
    if (value.check !== VERIFIER_CHECK) throw new Error('mismatch');
  } catch {
    throw new Error('PIN 不正确');
  }
  return key;
}

/** 修改 PIN：全量解密 → 新密钥重加密 → 单事务写回。返回新密钥。 */
export async function changePin(oldKey: CryptoKey, newPin: string): Promise<CryptoKey> {
  const [entryRows, analysisRows, draftRows] = await Promise.all([
    db.entries.toArray(),
    db.analysis.toArray(),
    db.drafts.toArray(),
  ]);

  const decEntries = await Promise.all(
    entryRows.map(async (row) => ({ row, plain: await unseal<{ content: string }>(oldKey, row.blob) })),
  );
  const decAnalysis = await Promise.all(
    analysisRows.map(async (row) => ({
      row,
      plain: await unseal<Omit<DiaryAnalysis, 'entry_date'>>(oldKey, row.blob),
    })),
  );
  const decDrafts = await Promise.all(
    draftRows.map(async (row) => ({ row, plain: await unseal<{ content: string }>(oldKey, row.blob) })),
  );

  const salt = randomSalt();
  const newKey = await deriveKey(newPin, salt);
  const verifier = await seal(newKey, { check: VERIFIER_CHECK });

  const newEntries = await Promise.all(
    decEntries.map(async ({ row, plain }) => ({ ...row, blob: await seal(newKey, plain) })),
  );
  const newAnalysis = await Promise.all(
    decAnalysis.map(async ({ row, plain }) => ({ ...row, blob: await seal(newKey, plain) })),
  );
  const newDrafts = await Promise.all(
    decDrafts.map(async ({ row, plain }) => ({ ...row, blob: await seal(newKey, plain) })),
  );

  await db.transaction('rw', [db.entries, db.analysis, db.drafts, db.meta], async () => {
    await db.entries.bulkPut(newEntries);
    await db.analysis.bulkPut(newAnalysis);
    await db.drafts.bulkPut(newDrafts);
    await db.meta.bulkPut([
      { key: 'pin_salt', value: toBase64(salt) },
      { key: 'pin_verifier', value: verifier },
      { key: 'pin_iterations', value: String(PBKDF2_ITERATIONS) },
    ]);
  });
  return newKey;
}

// ---------------------------------------------------------------------------
// 日记正文

export async function getEntry(key: CryptoKey, date: string): Promise<DiaryEntry | null> {
  const row = await db.entries.get(date);
  if (!row) return null;
  const plain = await unseal<{ content: string }>(key, row.blob);
  return { entry_date: date, content: plain.content, created_at: row.created_at, updated_at: row.updated_at };
}

export async function saveEntry(key: CryptoKey, date: string, content: string): Promise<void> {
  const existing = await db.entries.get(date);
  const blob = await seal(key, { content });
  await db.entries.put({
    entry_date: date,
    blob,
    created_at: existing?.created_at ?? nowIso(),
    updated_at: nowIso(),
  });
}

/** 删除某天的日记、分析与草稿。 */
export async function deleteEntryAll(date: string): Promise<void> {
  await db.transaction('rw', [db.entries, db.analysis, db.drafts], async () => {
    await db.entries.delete(date);
    await db.analysis.delete(date);
    await db.drafts.delete(date);
  });
}

// ---------------------------------------------------------------------------
// AI 分析

export async function getAnalysis(key: CryptoKey, date: string): Promise<DiaryAnalysis | null> {
  const row = await db.analysis.get(date);
  if (!row) return null;
  const plain = await unseal<Omit<DiaryAnalysis, 'entry_date'>>(key, row.blob);
  return { ...plain, entry_date: date };
}

export async function saveAnalysis(key: CryptoKey, analysis: DiaryAnalysis): Promise<void> {
  const { entry_date, ...rest } = analysis;
  const existing = await db.analysis.get(entry_date);
  const blob = await seal(key, rest);
  await db.analysis.put({
    entry_date,
    blob,
    created_at: existing?.created_at ?? analysis.created_at,
    updated_at: nowIso(),
  });
}

// ---------------------------------------------------------------------------
// 草稿（也是加密的：草稿即未保存的日记内容）

export async function getDraft(key: CryptoKey, date: string): Promise<string | null> {
  const row = await db.drafts.get(date);
  if (!row) return null;
  const plain = await unseal<{ content: string }>(key, row.blob);
  return plain.content;
}

export async function saveDraft(key: CryptoKey, date: string, content: string): Promise<void> {
  const blob = await seal(key, { content });
  await db.drafts.put({ entry_date: date, blob, updated_at: nowIso() });
}

export async function deleteDraft(date: string): Promise<void> {
  await db.drafts.delete(date);
}

// ---------------------------------------------------------------------------
// 范围查询（时间轴 / 趋势条）

export interface DayWithAnalysis {
  entry: DiaryEntry;
  analysis: DiaryAnalysis | null;
}

/** 闭区间 [startDate, endDate]（按字符串比较）。 */
export async function getRange(key: CryptoKey, startDate: string, endDate: string): Promise<DayWithAnalysis[]> {
  const [entryRows, analysisRows] = await Promise.all([
    db.entries.where('entry_date').between(startDate, endDate, true, true).toArray(),
    db.analysis.where('entry_date').between(startDate, endDate, true, true).toArray(),
  ]);
  const analysisMap = new Map<string, DiaryAnalysis>();
  await Promise.all(
    analysisRows.map(async (row) => {
      const plain = await unseal<Omit<DiaryAnalysis, 'entry_date'>>(key, row.blob);
      analysisMap.set(row.entry_date, { ...plain, entry_date: row.entry_date });
    }),
  );
  return Promise.all(
    entryRows.map(async (row) => {
      const plain = await unseal<{ content: string }>(key, row.blob);
      return {
        entry: {
          entry_date: row.entry_date,
          content: plain.content,
          created_at: row.created_at,
          updated_at: row.updated_at,
        },
        analysis: analysisMap.get(row.entry_date) ?? null,
      } satisfies DayWithAnalysis;
    }),
  );
}

// ---------------------------------------------------------------------------
// 导出 / 导入 / 清空

export async function exportAll(key: CryptoKey): Promise<BackupFile> {
  const [entryRows, analysisRows] = await Promise.all([db.entries.toArray(), db.analysis.toArray()]);
  const entries = await Promise.all(
    entryRows.map(async (row) => {
      const plain = await unseal<{ content: string }>(key, row.blob);
      return {
        entry_date: row.entry_date,
        content: plain.content,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    }),
  );
  const analysis = await Promise.all(
    analysisRows.map(async (row) => {
      const plain = await unseal<Omit<DiaryAnalysis, 'entry_date'>>(key, row.blob);
      return { ...plain, entry_date: row.entry_date };
    }),
  );
  return { version: 1, app: 'peer-diary-web', exported_at: nowIso(), entries, analysis };
}

function validateBackup(data: unknown): BackupFile {
  if (!data || typeof data !== 'object') throw new Error('备份文件格式不正确');
  const file = data as BackupFile;
  if (file.app !== 'peer-diary-web' || !Array.isArray(file.entries) || !Array.isArray(file.analysis)) {
    throw new Error('这不是同行日记 Web 版的备份文件');
  }
  for (const entry of file.entries) {
    if (typeof entry?.entry_date !== 'string' || typeof entry?.content !== 'string') {
      throw new Error('备份文件中有日记条目缺少日期或正文');
    }
  }
  return file;
}

/** 导入备份。merge：按日期覆盖合并；replace：清空后导入。 */
export async function importAll(
  key: CryptoKey,
  data: unknown,
  mode: 'merge' | 'replace',
): Promise<{ entries: number; analysis: number }> {
  const file = validateBackup(data);
  const entryRows = await Promise.all(
    file.entries.map(async (entry) => ({
      entry_date: entry.entry_date,
      blob: await seal(key, { content: entry.content }),
      created_at: entry.created_at || nowIso(),
      updated_at: entry.updated_at || nowIso(),
    })),
  );
  const analysisRows = await Promise.all(
    file.analysis.map(async (item) => {
      const { entry_date, ...rest } = item;
      return {
        entry_date,
        blob: await seal(key, rest),
        created_at: rest.created_at || nowIso(),
        updated_at: nowIso(),
      };
    }),
  );

  await db.transaction('rw', [db.entries, db.analysis, db.drafts], async () => {
    if (mode === 'replace') {
      await Promise.all([db.entries.clear(), db.analysis.clear(), db.drafts.clear()]);
    }
    await db.entries.bulkPut(entryRows);
    await db.analysis.bulkPut(analysisRows);
  });
  return { entries: entryRows.length, analysis: analysisRows.length };
}

/** 清空全部数据（保留 PIN 锁）。 */
export async function wipeAll(): Promise<void> {
  await db.transaction('rw', [db.entries, db.analysis, db.drafts], async () => {
    await Promise.all([db.entries.clear(), db.analysis.clear(), db.drafts.clear()]);
  });
}

/** 估算占用空间（字节），无法估算时返回 null。 */
export async function estimateStorage(): Promise<number | null> {
  try {
    if (navigator.storage?.estimate) {
      const { usage } = await navigator.storage.estimate();
      return typeof usage === 'number' ? usage : null;
    }
  } catch {
    // 忽略，返回 null
  }
  return null;
}

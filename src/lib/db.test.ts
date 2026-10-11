import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { deriveKey, randomSalt } from './crypto';
import {
  changePin,
  createLock,
  db,
  deleteDraft,
  deleteEntryAll,
  exportAll,
  getAnalysis,
  getDraft,
  getEntry,
  getRange,
  importAll,
  saveAnalysis,
  saveDraft,
  saveEntry,
  verifyPin,
  wipeAll,
} from './db';
import type { BackupFile } from '../types';

async function makeKey(): Promise<CryptoKey> {
  return deriveKey('1234', randomSalt(), 1000);
}

beforeEach(async () => {
  await Promise.all([
    db.entries.clear(),
    db.analysis.clear(),
    db.drafts.clear(),
    db.meta.clear(),
  ]);
});

describe('db 数据层', () => {
  it('日记保存与读取往返一致', async () => {
    const key = await makeKey();
    await saveEntry(key, '2026-10-11', '今天的日记内容');
    const entry = await getEntry(key, '2026-10-11');
    expect(entry?.content).toBe('今天的日记内容');
    expect(entry?.created_at).toBeTruthy();
    expect(await getEntry(key, '2026-10-12')).toBeNull();
  });

  it('覆盖保存保留 created_at、更新内容', async () => {
    const key = await makeKey();
    await saveEntry(key, '2026-10-11', 'v1');
    const first = await getEntry(key, '2026-10-11');
    await saveEntry(key, '2026-10-11', 'v2');
    const second = await getEntry(key, '2026-10-11');
    expect(second?.content).toBe('v2');
    expect(second?.created_at).toBe(first?.created_at);
  });

  it('AI 分析保存与读取', async () => {
    const key = await makeKey();
    await saveAnalysis(key, {
      entry_date: '2026-10-11',
      emotions: ['平静'],
      energy: 4,
      focus: 3,
      highlight: '高光',
      lowlight: '',
      small_win: '小胜利',
      tags: ['工作'],
      summary: '总结',
      model: 'deepseek-chat',
      created_at: '2026-10-11T10:00:00Z',
    });
    const analysis = await getAnalysis(key, '2026-10-11');
    expect(analysis?.energy).toBe(4);
    expect(analysis?.emotions).toEqual(['平静']);
    expect(await getAnalysis(key, '2026-10-10')).toBeNull();
  });

  it('草稿保存、读取与删除', async () => {
    const key = await makeKey();
    await saveDraft(key, '2026-10-11', '草稿内容');
    expect(await getDraft(key, '2026-10-11')).toBe('草稿内容');
    await deleteDraft('2026-10-11');
    expect(await getDraft(key, '2026-10-11')).toBeNull();
  });

  it('getRange 按日期区间过滤（时间轴 / 趋势条）', async () => {
    const key = await makeKey();
    await saveEntry(key, '2026-09-30', '九月');
    await saveEntry(key, '2026-10-01', '一号');
    await saveEntry(key, '2026-10-15', '十五号');
    await saveEntry(key, '2026-10-31', '月末');
    await saveEntry(key, '2026-11-01', '十一月');
    const rows = await getRange(key, '2026-10-01', '2026-10-31');
    const dates = rows.map((row) => row.entry.entry_date).sort();
    expect(dates).toEqual(['2026-10-01', '2026-10-15', '2026-10-31']);
  });

  it('PIN：设置后验证，错误 PIN 拒绝', async () => {
    await createLock('123456');
    await expect(verifyPin('000000')).rejects.toThrow('PIN 不正确');
    await expect(verifyPin('123456')).resolves.toBeInstanceOf(CryptoKey);
  });

  it('修改 PIN 后旧密钥失效、新密钥可读全部数据', async () => {
    const key = await createLock('111111');
    await saveEntry(key, '2026-10-11', '重加密前内容');
    await saveAnalysis(key, {
      entry_date: '2026-10-11',
      emotions: ['期待'],
      energy: 5,
      focus: 5,
      highlight: '',
      lowlight: '',
      small_win: '',
      tags: [],
      summary: '',
      model: 'm',
      created_at: 'z',
    });
    await saveDraft(key, '2026-10-12', '草稿');

    const newKey = await changePin(key, '222222');
    expect((await getEntry(newKey, '2026-10-11'))?.content).toBe('重加密前内容');
    expect((await getAnalysis(newKey, '2026-10-11'))?.energy).toBe(5);
    expect(await getDraft(newKey, '2026-10-12')).toBe('草稿');
    await expect(verifyPin('111111')).rejects.toThrow('PIN 不正确');
    await expect(verifyPin('222222')).resolves.toBeInstanceOf(CryptoKey);
  });

  it('JSON 备份导出再合并导入', async () => {
    const key = await makeKey();
    await saveEntry(key, '2026-10-01', 'A');
    const backup = await exportAll(key);
    expect(backup.app).toBe('peer-diary-web');
    expect(backup.entries).toHaveLength(1);

    await importAll(key, backup, 'merge');
    expect((await getEntry(key, '2026-10-01'))?.content).toBe('A');
  });

  it('导入支持合并（覆盖同日期）与替换（清空后导入）', async () => {
    const key = await makeKey();
    const backup: BackupFile = {
      version: 1,
      app: 'peer-diary-web',
      exported_at: '2026-10-11T00:00:00Z',
      entries: [
        { entry_date: '2026-10-01', content: 'A', created_at: 'x', updated_at: 'x' },
        { entry_date: '2026-10-02', content: 'B', created_at: 'x', updated_at: 'x' },
      ],
      analysis: [],
    };
    await saveEntry(key, '2026-10-02', '本地B');
    await importAll(key, backup, 'merge');
    expect((await getEntry(key, '2026-10-01'))?.content).toBe('A');
    expect((await getEntry(key, '2026-10-02'))?.content).toBe('B');

    await saveEntry(key, '2026-10-05', '本地C');
    await importAll(key, backup, 'replace');
    expect(await getEntry(key, '2026-10-05')).toBeNull();
    expect((await getEntry(key, '2026-10-01'))?.content).toBe('A');
  });

  it('导入拒绝非本应用备份文件', async () => {
    const key = await makeKey();
    await expect(importAll(key, { app: 'other' }, 'merge')).rejects.toThrow();
    await expect(importAll(key, { version: 1, app: 'peer-diary-web', entries: 'no' }, 'merge')).rejects.toThrow();
  });

  it('删除某天会同时删除日记、分析与草稿', async () => {
    const key = await makeKey();
    await saveEntry(key, '2026-10-11', '内容');
    await saveAnalysis(key, {
      entry_date: '2026-10-11',
      emotions: [],
      energy: 3,
      focus: 3,
      highlight: '',
      lowlight: '',
      small_win: '',
      tags: [],
      summary: '',
      model: 'm',
      created_at: 'z',
    });
    await saveDraft(key, '2026-10-11', '草稿');
    await deleteEntryAll('2026-10-11');
    expect(await getEntry(key, '2026-10-11')).toBeNull();
    expect(await getAnalysis(key, '2026-10-11')).toBeNull();
    expect(await getDraft(key, '2026-10-11')).toBeNull();
  });

  it('清空数据保留 PIN 锁', async () => {
    const key = await createLock('1234');
    await saveEntry(key, '2026-10-11', '内容');
    await wipeAll();
    expect(await getEntry(key, '2026-10-11')).toBeNull();
    await expect(verifyPin('1234')).resolves.toBeInstanceOf(CryptoKey);
  });
});

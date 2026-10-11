// 数据导出与迁移：Markdown 导出（可按日期区间）、JSON 明文备份、导入、清空。

import { useRef, useState } from 'react';
import { Download, FileText, Trash2, Upload } from 'lucide-react';
import { exportAll, importAll, wipeAll } from '../lib/db';
import { renderDiaryMarkdown } from '../lib/exportMarkdown';
import { useDiaryStore } from '../stores/diaryStore';
import { useLockStore } from '../stores/lockStore';
import { toast } from '../stores/toastStore';
import type { BackupFile, DiaryAnalysis } from '../types';
import { fileTimestamp } from '../utils/date';
import { downloadText } from '../utils/errors';
import { askConfirm, Section } from './ui';

export default function DataExport() {
  const key = useLockStore((state) => state.key);
  const reload = useDiaryStore((state) => state.reload);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExportMarkdown() {
    if (!key) return;
    try {
      const backup = await exportAll(key);
      const range = { startDate: startDate || undefined, endDate: endDate || undefined };
      const entries = backup.entries.filter(
        (item) =>
          (!range.startDate || item.entry_date >= range.startDate) &&
          (!range.endDate || item.entry_date <= range.endDate),
      );
      if (entries.length === 0) {
        toast('所选范围内没有日记', 'error');
        return;
      }
      const analyses = new Map<string, DiaryAnalysis>(
        backup.analysis.map((item): [string, DiaryAnalysis] => [item.entry_date, item]),
      );
      const markdown = renderDiaryMarkdown(entries, analyses, range);
      downloadText(`同行日记_${fileTimestamp()}.md`, markdown, 'text/markdown;charset=utf-8');
      toast(`已导出 ${entries.length} 篇日记`, 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : '导出失败', 'error');
    }
  }

  async function handleExportJson() {
    if (!key) return;
    try {
      const backup = await exportAll(key);
      if (backup.entries.length === 0) {
        toast('还没有可备份的日记', 'error');
        return;
      }
      downloadText(
        `同行日记备份_${fileTimestamp()}.json`,
        JSON.stringify(backup, null, 2),
        'application/json',
      );
      toast(`已导出 ${backup.entries.length} 篇日记（明文文件，请妥善保管）`, 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : '备份失败', 'error');
    }
  }

  async function handleImportFile(file: File) {
    if (!key) return;
    if (importMode === 'replace') {
      const confirmed = await askConfirm({
        title: '替换导入',
        message: '将清空本机现有全部日记与分析，再导入备份文件。此操作不可恢复，确定继续吗？',
        confirmText: '替换',
        danger: true,
      });
      if (!confirmed) return;
    }
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as BackupFile;
      const result = await importAll(key, data, importMode);
      toast(`导入完成：${result.entries} 篇日记、${result.analysis} 条分析`, 'success');
      reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : '导入失败', 'error');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleWipe() {
    const first = await askConfirm({
      title: '清空全部数据',
      message: '将删除本机全部日记与 AI 分析，且无法恢复（已导出的备份文件不受影响）。确定继续吗？',
      confirmText: '继续',
      danger: true,
    });
    if (!first) return;
    const second = await askConfirm({
      title: '再次确认',
      message: '真的要清空这台设备上的全部日记吗？',
      confirmText: '清空',
      danger: true,
    });
    if (!second) return;
    try {
      await wipeAll();
      reload();
      toast('已清空全部数据');
    } catch (error) {
      toast(error instanceof Error ? error.message : '清空失败', 'error');
    }
  }

  return (
    <>
      <Section title="导出 Markdown" description="适合存档，或投喂给其他 AI 做进一步分析。">
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="muted-label">开始日期（可留空）</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="soft-input mt-1 w-full"
            />
          </label>
          <label className="block">
            <span className="muted-label">结束日期（可留空）</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="soft-input mt-1 w-full"
            />
          </label>
        </div>
        <button type="button" onClick={handleExportMarkdown} className="primary-button mt-3 text-xs">
          <FileText size={13} /> 导出 Markdown
        </button>
      </Section>

      <Section title="备份 / 迁移" description="JSON 明文备份，用于跨浏览器、跨设备迁移数据。">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleExportJson} className="secondary-button text-xs">
            <Download size={13} /> 导出 JSON 备份
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="secondary-button text-xs"
          >
            <Upload size={13} /> {importing ? '导入中…' : '导入 JSON 备份'}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-journal-600">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="import-mode"
              checked={importMode === 'merge'}
              onChange={() => setImportMode('merge')}
              className="accent-calm-600"
            />
            合并（覆盖相同日期）
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="import-mode"
              checked={importMode === 'replace'}
              onChange={() => setImportMode('replace')}
              className="accent-calm-600"
            />
            替换（清空后导入）
          </label>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleImportFile(file);
          }}
        />
      </Section>

      <Section title="危险操作" description="清空后只能靠之前导出的备份找回。">
        <button type="button" onClick={handleWipe} className="danger-button text-xs">
          <Trash2 size={13} /> 清空全部数据
        </button>
      </Section>
    </>
  );
}

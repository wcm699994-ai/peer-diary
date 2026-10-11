// Markdown 导出：格式对齐桌面版 render_markdown，AI 生成的指标在标题中注明。

import { format } from 'date-fns';
import type { DiaryAnalysis, DiaryEntry } from '../types';

export interface MarkdownRange {
  startDate?: string;
  endDate?: string;
}

function pushSection(lines: string[], title: string, content: string): void {
  const trimmed = content.trim();
  if (trimmed) lines.push(`### ${title}\n\n${trimmed}\n`);
}

export function renderDiaryMarkdown(
  entries: DiaryEntry[],
  analyses: Map<string, DiaryAnalysis>,
  range: MarkdownRange,
  now: Date = new Date(),
): string {
  const sorted = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  const rangeText = range.startDate && range.endDate
    ? `${range.startDate} 至 ${range.endDate}`
    : range.startDate
      ? `${range.startDate} 起`
      : range.endDate
        ? `截至 ${range.endDate}`
        : '全部日期';

  const lines: string[] = [];
  lines.push('# 同行日记\n');
  lines.push(`- 导出时间：${format(now, 'yyyy-MM-dd HH:mm')}`);
  lines.push(`- 日期范围：${rangeText}`);
  lines.push(`- 日记数量：${sorted.length}`);
  lines.push('- 说明：情绪、能量/专注、高光、低谷、小胜利、标签、总结均由 AI 分析生成，仅供参照\n');
  lines.push('---');

  for (const entry of sorted) {
    lines.push(`\n## ${entry.entry_date}\n`);
    pushSection(lines, '日记正文', entry.content);
    const analysis = analyses.get(entry.entry_date);
    if (analysis) {
      if (analysis.emotions.length > 0) {
        pushSection(lines, '情绪（AI 分析）', analysis.emotions.join('、'));
      }
      const metrics: string[] = [];
      if (analysis.energy) metrics.push(`能量：${analysis.energy} / 5`);
      if (analysis.focus) metrics.push(`专注：${analysis.focus} / 5`);
      if (metrics.length > 0) pushSection(lines, '能量与专注（AI 分析）', metrics.join('\n\n'));
      pushSection(lines, '今日高光（AI 分析）', analysis.highlight);
      pushSection(lines, '低谷时刻（AI 分析）', analysis.lowlight);
      pushSection(lines, '今日小胜利（AI 分析）', analysis.small_win);
      if (analysis.tags.length > 0) {
        pushSection(lines, '标签（AI 分析）', analysis.tags.join('、'));
      }
      pushSection(lines, '总结（AI 分析）', analysis.summary);
    }
    lines.push('\n---');
  }
  return `${lines.join('\n')}\n`;
}

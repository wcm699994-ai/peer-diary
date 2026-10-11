import { describe, expect, it } from 'vitest';
import { renderDiaryMarkdown } from './exportMarkdown';
import type { DiaryAnalysis, DiaryEntry } from '../types';

const entry: DiaryEntry = {
  entry_date: '2026-10-11',
  content: '今天写了一些文字。',
  created_at: 'c',
  updated_at: 'u',
};

const analysis: DiaryAnalysis = {
  entry_date: '2026-10-11',
  emotions: ['平静', '期待'],
  energy: 4,
  focus: 3,
  highlight: '高光时刻',
  lowlight: '',
  small_win: '小胜利',
  tags: ['工作'],
  summary: '总结一句',
  model: 'deepseek-chat',
  created_at: 'z',
};

describe('renderDiaryMarkdown 导出格式', () => {
  it('包含头部、正文与 AI 分析分节，空段落不输出', () => {
    const md = renderDiaryMarkdown([entry], new Map([[entry.entry_date, analysis]]), {});
    expect(md).toContain('# 同行日记');
    expect(md).toContain('- 日记数量：1');
    expect(md).toContain('## 2026-10-11');
    expect(md).toContain('### 日记正文');
    expect(md).toContain('今天写了一些文字。');
    expect(md).toContain('### 情绪（AI 分析）');
    expect(md).toContain('平静、期待');
    expect(md).toContain('能量：4 / 5');
    expect(md).toContain('专注：3 / 5');
    expect(md).toContain('### 今日小胜利（AI 分析）');
    expect(md).toContain('### 总结（AI 分析）');
    expect(md).not.toContain('### 低谷时刻');
  });

  it('按日期升序排列', () => {
    const early = { ...entry, entry_date: '2026-10-02' };
    const late = { ...entry, entry_date: '2026-10-11' };
    const md = renderDiaryMarkdown([late, early], new Map(), {});
    expect(md.indexOf('## 2026-10-02')).toBeLessThan(md.indexOf('## 2026-10-11'));
  });

  it('日期范围描述', () => {
    const md = renderDiaryMarkdown([entry], new Map(), {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    });
    expect(md).toContain('2026-10-01 至 2026-10-31');
  });

  it('没有分析的日记只输出正文', () => {
    const md = renderDiaryMarkdown([entry], new Map(), {});
    expect(md).not.toContain('### 情绪');
    expect(md).not.toContain('### 今日高光');
  });
});

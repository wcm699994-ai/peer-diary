import { describe, expect, it } from 'vitest';
import { buildAnalysisMessages, parseAnalysisJson } from './ai';

describe('parseAnalysisJson 解析容错', () => {
  it('解析纯 JSON', () => {
    const payload = parseAnalysisJson(
      '{"emotions":["平静","期待"],"energy":4,"focus":3,"highlight":"高光","lowlight":"","small_win":"小胜利","tags":["工作"],"summary":"总结"}',
    );
    expect(payload.emotions).toEqual(['平静', '期待']);
    expect(payload.energy).toBe(4);
    expect(payload.focus).toBe(3);
    expect(payload.summary).toBe('总结');
  });

  it('剥离 markdown 围栏与前后缀说明文字', () => {
    const raw = [
      '好的，以下是分析结果：',
      '```json',
      '{"emotions":["开心"],"energy":5,"focus":5,"highlight":"h","lowlight":"l","small_win":"w","tags":["t"],"summary":"s"}',
      '```',
      '希望对你有帮助。',
    ].join('\n');
    const payload = parseAnalysisJson(raw);
    expect(payload.energy).toBe(5);
    expect(payload.emotions).toEqual(['开心']);
  });

  it('分数收敛到 1~5，非法条目被过滤', () => {
    const payload = parseAnalysisJson('{"emotions":["", 42, "焦虑"],"energy":99,"focus":0}');
    expect(payload.emotions).toEqual(['焦虑']);
    expect(payload.energy).toBe(5);
    expect(payload.focus).toBe(1);
    expect(payload.highlight).toBe('');
  });

  it('缺少字段时给出默认值而不是抛错', () => {
    const payload = parseAnalysisJson('{}');
    expect(payload.emotions).toEqual([]);
    expect(payload.energy).toBe(3);
    expect(payload.summary).toBe('');
  });

  it('垃圾输入抛出解析错误', () => {
    expect(() => parseAnalysisJson('这完全不是 JSON')).toThrow();
    expect(() => parseAnalysisJson('[]')).toThrow();
  });
});

describe('buildAnalysisMessages', () => {
  it('包含日期与正文，system 在前', () => {
    const messages = buildAnalysisMessages('2026-10-11', '正文内容');
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
    expect(messages[1].content).toContain('2026-10-11');
    expect(messages[1].content).toContain('正文内容');
  });
});

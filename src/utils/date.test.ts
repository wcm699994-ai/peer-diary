import { describe, expect, it } from 'vitest';
import { addDaysStr, buildMonthMatrix, monthLabel, todayStr } from './date';

describe('日期工具', () => {
  it('跨月加减一天', () => {
    expect(addDaysStr('2026-10-01', -1)).toBe('2026-09-30');
    expect(addDaysStr('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDaysStr('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('月历矩阵：周一起始、覆盖整月 31 天（2026-10）', () => {
    const rows = buildMonthMatrix('2026-10');
    const flat = rows.flat();
    expect(flat.filter((day) => day.startsWith('2026-10'))).toHaveLength(31);
    // 第一格是周一
    expect(new Date(`${flat[0]}T00:00:00`).getDay()).toBe(1);
    // 2026-10-01 是周四，所以第一格是 9 月 28 日
    expect(flat[0]).toBe('2026-09-28');
  });

  it('月份标签', () => {
    expect(monthLabel('2026-10')).toBe('2026年10月');
  });

  it('今天格式', () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

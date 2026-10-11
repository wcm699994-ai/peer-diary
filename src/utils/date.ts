// 日期工具：字符串一律 'yyyy-MM-dd'，本地时区。

import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  lastDayOfMonth,
  parseISO,
  startOfWeek,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

export const toDate = (dateStr: string): Date => parseISO(`${dateStr}T00:00:00`);

export const dateToStr = (date: Date): string => format(date, 'yyyy-MM-dd');

export const todayStr = (): string => dateToStr(new Date());

export const addDaysStr = (dateStr: string, days: number): string =>
  dateToStr(addDays(toDate(dateStr), days));

export const monthOf = (dateStr: string): string => dateStr.slice(0, 7);

export const isFutureDay = (dateStr: string): boolean => dateStr > todayStr();

export function displayDate(dateStr: string): string {
  return format(toDate(dateStr), 'M月d日 EEEE', { locale: zhCN });
}

export function displayDateShort(dateStr: string): string {
  return format(toDate(dateStr), 'M月d日', { locale: zhCN });
}

export function monthLabel(month: string): string {
  const [year, m] = month.split('-');
  return `${year}年${Number(m)}月`;
}

/** 月历矩阵（周一开头），返回日期字符串，含前后月补位。 */
export function buildMonthMatrix(month: string): string[][] {
  const first = toDate(`${month}-01`);
  const start = startOfWeek(first, { weekStartsOn: 1 });
  const end = endOfWeek(lastDayOfMonth(first), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });
  const rows: string[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    rows.push(days.slice(i, i + 7).map(dateToStr));
  }
  return rows;
}

export const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

/** 文件名安全的时间戳，如 20261011_2130。 */
export function fileTimestamp(now: Date = new Date()): string {
  return format(now, 'yyyyMMdd_HHmm');
}

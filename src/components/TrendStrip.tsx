// 近 7 天能量/专注迷你趋势条（数据来自 AI 分析）。

import { useEffect, useState } from 'react';
import * as dbApi from '../lib/db';
import { useDiaryStore } from '../stores/diaryStore';
import { useLockStore } from '../stores/lockStore';
import { useUiStore } from '../stores/uiStore';
import { addDaysStr, displayDateShort, todayStr } from '../utils/date';

interface DayPoint {
  date: string;
  energy: number | null;
  focus: number | null;
  hasEntry: boolean;
}

export default function TrendStrip() {
  const key = useLockStore((state) => state.key);
  const reloadToken = useDiaryStore((state) => state.reloadToken);
  const currentDate = useDiaryStore((state) => state.currentDate);
  const openDate = useUiStore((state) => state.openDate);
  const [days, setDays] = useState<DayPoint[]>([]);
  const today = todayStr();

  useEffect(() => {
    if (!key) return;
    const end = today;
    const start = addDaysStr(end, -6);
    let cancelled = false;
    void dbApi
      .getRange(key, start, end)
      .then((rows) => {
        if (cancelled) return;
        const map = new Map(rows.map((row) => [row.entry.entry_date, row]));
        const list: DayPoint[] = Array.from({ length: 7 }, (_, index) => {
          const date = addDaysStr(start, index);
          const row = map.get(date);
          return {
            date,
            energy: row?.analysis?.energy ?? null,
            focus: row?.analysis?.focus ?? null,
            hasEntry: Boolean(row),
          };
        });
        setDays(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [key, reloadToken, currentDate, today]);

  if (days.every((day) => !day.hasEntry)) return null;

  return (
    <section className="book-card px-4 py-3" aria-label="近 7 天概览">
      <h2 className="muted-label mb-2">近 7 天</h2>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const active = day.date === currentDate;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => openDate(day.date)}
              className={`flex min-h-14 flex-col items-center justify-end gap-1 rounded-book px-0.5 pb-1.5 pt-1 ${
                active ? 'bg-journal-100' : 'hover:bg-journal-50'
              }`}
              title={`${day.date}${day.energy ? ` · 能量 ${day.energy}/5` : ''}`}
            >
              <span
                className={`text-[10px] ${day.date === today ? 'font-semibold text-calm-700' : 'text-journal-400'}`}
              >
                {displayDateShort(day.date).replace(/月.*/, '')}
              </span>
              {day.hasEntry ? (
                <div className="flex h-6 w-full items-end justify-center gap-0.5">
                  <span
                    className="w-1.5 rounded-sm bg-calm-400"
                    style={{ height: `${(day.energy ?? 3) * 20}%` }}
                  />
                  <span
                    className="w-1.5 rounded-sm bg-warm-300"
                    style={{ height: `${(day.focus ?? 3) * 20}%` }}
                  />
                </div>
              ) : (
                <span className="mb-2 h-1 w-1 rounded-full bg-journal-200" />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

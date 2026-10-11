// 时间轴页：按月日历（有日记的日期标记 + 能量着色）+ 当月日记列表。
// 点击任意一天跳到日记页查看。

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import * as dbApi from '../lib/db';
import { useDiaryStore } from '../stores/diaryStore';
import { useLockStore } from '../stores/lockStore';
import { useUiStore } from '../stores/uiStore';
import { WEEKDAY_LABELS, buildMonthMatrix, monthLabel, monthOf, todayStr } from '../utils/date';
import { EmotionChip } from './AnalysisCard';
import { EmptyState } from './ui';

interface MonthData {
  dates: Map<string, dbApi.DayWithAnalysis>;
  list: dbApi.DayWithAnalysis[];
}

export default function TimelinePage() {
  const key = useLockStore((state) => state.key);
  const reloadToken = useDiaryStore((state) => state.reloadToken);
  const currentDate = useDiaryStore((state) => state.currentDate);
  const openDate = useUiStore((state) => state.openDate);
  const [month, setMonth] = useState(() => monthOf(todayStr()));
  const [data, setData] = useState<MonthData | null>(null);
  const [loading, setLoading] = useState(false);
  const today = todayStr();

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    setLoading(true);
    void dbApi
      .getRange(key, `${month}-01`, `${month}-31`)
      .then((rows) => {
        if (cancelled) return;
        const sorted = [...rows].sort((a, b) => b.entry.entry_date.localeCompare(a.entry.entry_date));
        setData({
          dates: new Map(rows.map((row) => [row.entry.entry_date, row])),
          list: sorted,
        });
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, month, reloadToken]);

  const matrix = useMemo(() => buildMonthMatrix(month), [month]);

  function shiftMonth(delta: number) {
    const [year, m] = month.split('-').map(Number);
    const next = new Date(year, m - 1 + delta, 1);
    setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="book-card flex items-center justify-between px-2 py-1.5">
        <button type="button" onClick={() => shiftMonth(-1)} className="icon-button" aria-label="上个月">
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-calm-800">{monthLabel(month)}</span>
          {month !== monthOf(today) && (
            <button
              type="button"
              onClick={() => setMonth(monthOf(today))}
              className="secondary-button h-7 px-2.5 text-xs"
            >
              今天
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          disabled={month >= monthOf(today)}
          className="icon-button"
          aria-label="下个月"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="book-card p-3 sm:p-4">
        <div className="mb-1 grid grid-cols-7 text-center">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label} className="py-1 text-[11px] text-journal-400">
              {label}
            </span>
          ))}
        </div>
        {matrix.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7">
            {week.map((day) => {
              const inMonth = day.startsWith(month);
              const row = data?.dates.get(day);
              const hasEntry = Boolean(row);
              const isToday = day === today;
              const active = day === currentDate;
              const energy = row?.analysis?.energy ?? null;
              return (
                <button
                  key={day}
                  type="button"
                  disabled={!hasEntry}
                  onClick={() => openDate(day)}
                  className={`relative flex h-12 flex-col items-center justify-center gap-0.5 rounded-book text-sm ${
                    inMonth ? 'text-calm-800' : 'text-journal-300'
                  } ${hasEntry ? 'hover:bg-journal-100' : 'cursor-default'} ${
                    active ? 'ring-1 ring-calm-400' : isToday && inMonth ? 'ring-1 ring-journal-200' : ''
                  }`}
                  aria-label={`${day}${hasEntry ? '，有日记' : ''}`}
                >
                  <span className={isToday && inMonth ? 'font-semibold' : ''}>{Number(day.slice(8))}</span>
                  {hasEntry && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        energy !== null && energy <= 2
                          ? 'bg-warm-400'
                          : energy !== null && energy >= 4
                            ? 'bg-calm-500'
                            : 'bg-journal-300'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {loading && <div className="book-card p-5 text-center text-sm text-journal-400">加载中…</div>}

        {!loading && data && data.list.length === 0 && (
          <div className="book-card">
            <EmptyState
              icon={<CalendarDays size={28} />}
              title="这个月还没有日记"
              description="回到「日记」写下第一篇吧。"
            />
          </div>
        )}

        {!loading &&
          data?.list.map(({ entry, analysis }) => (
            <button
              key={entry.entry_date}
              type="button"
              onClick={() => openDate(entry.entry_date)}
              className="book-card block w-full p-4 text-left"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-calm-800">{entry.entry_date}</span>
                {analysis && (
                  <span className="text-[10px] text-journal-400">
                    能量 {analysis.energy} · 专注 {analysis.focus}
                  </span>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-calm-700">{entry.content}</p>
              {analysis && analysis.emotions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {analysis.emotions.slice(0, 3).map((tag) => (
                    <EmotionChip key={tag} tag={tag} small />
                  ))}
                </div>
              )}
            </button>
          ))}
      </div>
    </div>
  );
}

// 写日记页：日期导航 + 大号自动增高输入框 + 加密草稿 + AI 分析卡。
// 移动端支持左右滑动切换日期。

import { useEffect, useRef, useState, type TouchEvent } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import * as dbApi from '../lib/db';
import { useDiaryStore } from '../stores/diaryStore';
import { useLockStore } from '../stores/lockStore';
import { toast } from '../stores/toastStore';
import { addDaysStr, displayDate, isFutureDay, todayStr } from '../utils/date';
import { toUserFacingError } from '../utils/errors';
import AnalysisCard from './AnalysisCard';
import TrendStrip from './TrendStrip';
import { askConfirm } from './ui';

export default function WritePage() {
  const entry = useDiaryStore((state) => state.entry);
  const loading = useDiaryStore((state) => state.loading);
  const saving = useDiaryStore((state) => state.saving);
  const editing = useDiaryStore((state) => state.editing);
  const currentDate = useDiaryStore((state) => state.currentDate);
  const loadDate = useDiaryStore((state) => state.loadDate);
  const setDate = useDiaryStore((state) => state.setDate);
  const saveContent = useDiaryStore((state) => state.saveContent);
  const startEditing = useDiaryStore((state) => state.startEditing);
  const cancelEditing = useDiaryStore((state) => state.cancelEditing);
  const deleteCurrent = useDiaryStore((state) => state.deleteCurrent);
  const reloadToken = useDiaryStore((state) => state.reloadToken);
  const key = useLockStore((state) => state.key);
  const today = todayStr();

  const [text, setText] = useState('');
  const [draftRestored, setDraftRestored] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const draftTimer = useRef<number | null>(null);
  const pendingDraft = useRef<{ date: string; content: string } | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const date = currentDate;
  const isFuture = isFutureDay(date);

  // 日期变化 / 解锁 / 数据更新后重新加载
  useEffect(() => {
    if (key) void loadDate(date);
  }, [date, key, reloadToken, loadDate]);

  // 表单灌水：已保存日记 → 正文；没有日记 → 恢复加密草稿。
  // 编辑中跳过重灌：分析完成触发的 reload 不能清掉用户正在输入的文字。
  useEffect(() => {
    if (loading || editing) return;
    let cancelled = false;
    if (entry) {
      setText(entry.content);
      setDraftRestored(false);
      return () => {
        cancelled = true;
      };
    }
    if (!key) return;
    void dbApi
      .getDraft(key, date)
      .then((draft) => {
        if (cancelled || useDiaryStore.getState().currentDate !== date) return;
        if (draft) {
          setText(draft);
          setDraftRestored(draft.trim().length > 0);
        } else {
          setText('');
          setDraftRestored(false);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [entry, loading, editing, date, key]);

  // 草稿自动保存（防抖 800ms；切换日期立即落盘）
  useEffect(() => {
    const canDraft = !entry && !loading && !isFuture && text.trim().length > 0 && date <= today;
    if (!canDraft) {
      if (draftTimer.current !== null) {
        window.clearTimeout(draftTimer.current);
        draftTimer.current = null;
      }
      pendingDraft.current = null;
      return;
    }
    pendingDraft.current = { date, content: text };
    if (draftTimer.current !== null) window.clearTimeout(draftTimer.current);
    draftTimer.current = window.setTimeout(() => {
      const payload = pendingDraft.current;
      draftTimer.current = null;
      const currentKey = useLockStore.getState().key;
      if (payload && currentKey) {
        void dbApi.saveDraft(currentKey, payload.date, payload.content).catch(() => {});
      }
    }, 800);
    return () => {
      if (draftTimer.current !== null) {
        window.clearTimeout(draftTimer.current);
        draftTimer.current = null;
      }
      const payload = pendingDraft.current;
      if (payload && payload.date !== useDiaryStore.getState().currentDate) {
        pendingDraft.current = null;
        const currentKey = useLockStore.getState().key;
        if (currentKey) {
          void dbApi.saveDraft(currentKey, payload.date, payload.content).catch(() => {});
        }
      }
    };
  }, [text, date, entry, loading, isFuture, today]);

  // 页面隐藏前把待保存草稿落盘
  useEffect(() => {
    const flush = () => {
      if (draftTimer.current !== null) {
        window.clearTimeout(draftTimer.current);
        draftTimer.current = null;
      }
      const payload = pendingDraft.current;
      pendingDraft.current = null;
      const currentKey = useLockStore.getState().key;
      if (payload && currentKey) {
        void dbApi.saveDraft(currentKey, payload.date, payload.content).catch(() => {});
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // 输入框自动增高
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [text, editing, entry]);

  const goPrev = () => setDate(addDaysStr(date, -1));
  const goNext = () => {
    const next = addDaysStr(date, 1);
    if (!isFutureDay(next)) setDate(next);
  };

  function openDatePicker() {
    const input = dateInputRef.current;
    if (!input) return;
    try {
      if (typeof input.showPicker === 'function') input.showPicker();
      else input.click();
    } catch {
      input.click();
    }
  }

  function handleTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    if ((event.target as HTMLElement).closest('textarea, input, button, a')) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 64 || Math.abs(dy) > 48) return;
    if (dx < 0) goNext();
    else goPrev();
  }

  async function handleSave() {
    if (!text.trim()) {
      toast('写点什么再保存吧');
      return;
    }
    try {
      await saveContent(text);
      toast('已保存', 'success');
    } catch (error) {
      toast(toUserFacingError(error, '保存失败，请稍后重试。'), 'error');
    }
  }

  async function handleDelete() {
    const confirmed = await askConfirm({
      title: '删除这篇日记',
      message: '将删除日记正文与 AI 分析，此操作无法恢复。确定删除吗？',
      confirmText: '删除',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await deleteCurrent();
      setText('');
      toast('已删除');
    } catch (error) {
      toast(toUserFacingError(error, '删除失败，请稍后重试。'), 'error');
    }
  }

  function handleCancelEdit() {
    setText(entry?.content ?? '');
    cancelEditing();
  }

  const readOnlyView = Boolean(entry) && !editing;

  return (
    <div className="space-y-4 pb-6" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* 日期导航 */}
      <div className="book-card relative flex items-center justify-between gap-1 px-2 py-1.5">
        <button type="button" onClick={goPrev} className="icon-button" aria-label="前一天">
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={openDatePicker}
          className="flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-calm-700 transition-colors hover:bg-journal-100"
          aria-label="选择日期"
        >
          <Calendar size={15} />
          <span>{displayDate(date)}</span>
          {date === today && (
            <span className="rounded-full bg-calm-500 px-1.5 py-0.5 text-[10px] text-white">今天</span>
          )}
        </button>
        <input
          ref={dateInputRef}
          type="date"
          value={date}
          onChange={(event) => {
            if (event.target.value) setDate(event.target.value);
          }}
          tabIndex={-1}
          aria-hidden="true"
          className="absolute left-1/2 top-0 h-px w-px opacity-0"
        />
        <button
          type="button"
          onClick={goNext}
          disabled={addDaysStr(date, 1) > today}
          className="icon-button"
          aria-label="后一天"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <TrendStrip />

      <div key={date} className="date-transition space-y-4">
        {loading && <div className="book-card p-6 text-center text-sm text-journal-400">加载中…</div>}

        {!loading && isFuture && (
          <div className="book-card p-5 text-center text-sm text-journal-500">
            未来还没有内容，日记要等当天来写。
          </div>
        )}

        {!loading && !isFuture && readOnlyView && entry && (
          <article className="book-card p-4 sm:p-5">
            <p className="mb-2 text-xs text-journal-400">
              最后保存于 {format(new Date(entry.updated_at), 'M月d日 HH:mm', { locale: zhCN })}
            </p>
            <p className="whitespace-pre-wrap text-[15px] leading-8 text-calm-900">{entry.content}</p>
            <div className="mt-4 flex justify-end gap-2 border-t border-journal-100 pt-3">
              <button type="button" onClick={handleDelete} className="danger-button text-xs">
                <Trash2 size={13} /> 删除
              </button>
              <button type="button" onClick={startEditing} className="secondary-button text-xs">
                <Pencil size={13} /> 编辑
              </button>
            </div>
          </article>
        )}

        {!loading && !isFuture && !readOnlyView && (
          <div className="book-card p-3 sm:p-4">
            {draftRestored && !entry && (
              <p className="mb-2 text-xs text-journal-500">已恢复上次未保存的草稿</p>
            )}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setDraftRestored(false);
              }}
              disabled={saving}
              placeholder="今天过得怎么样？想到什么写什么，这里没有评判。"
              className="diary-textarea"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-journal-400">{text.length} 字</span>
              <div className="flex gap-2">
                {editing && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="secondary-button text-xs"
                    disabled={saving}
                  >
                    取消
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !text.trim()}
                  className="primary-button text-xs"
                >
                  {saving ? '保存中…' : entry ? '保存修改' : '保存今天的日记'}
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !isFuture && <AnalysisCard />}
      </div>
    </div>
  );
}

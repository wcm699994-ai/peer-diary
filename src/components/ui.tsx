// 通用 UI：卡片分节、加载态、确认弹窗、Toast、空状态。

import { useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { useToastStore } from '../stores/toastStore';

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="book-card p-4 sm:p-5">
      <div className="mb-3">
        <h2 className="section-title">{title}</h2>
        {description && <p className="muted-label mt-1 leading-5">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-sm text-journal-500">
      <Loader2 size={16} className="animate-spin" />
      {label ?? '加载中…'}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      {icon && <div className="text-journal-300">{icon}</div>}
      <p className="text-sm font-medium text-calm-700">{title}</p>
      {description && <p className="max-w-xs text-xs leading-5 text-journal-500">{description}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 确认弹窗（promise 风格，模仿桌面版 askConfirm）

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
}

type AskFn = (options: ConfirmOptions) => Promise<boolean>;

let askRef: AskFn | null = null;

export function askConfirm(options: ConfirmOptions | string): Promise<boolean> {
  const resolved =
    typeof options === 'string' ? { title: '确认操作', message: options } : options;
  return askRef ? askRef(resolved) : Promise.resolve(window.confirm(resolved.message));
}

export function ConfirmHost() {
  const [pending, setPending] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  useEffect(() => {
    askRef = (options) =>
      new Promise<boolean>((resolve) => setPending({ options, resolve }));
    return () => {
      askRef = null;
    };
  }, []);

  if (!pending) return null;
  const { options, resolve } = pending;
  const answer = (value: boolean) => {
    resolve(value);
    setPending(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div className="absolute inset-0 bg-calm-950/30" onClick={() => answer(false)} />
      <div
        className="modal-enter relative w-full max-w-sm rounded-book border border-journal-200 p-5"
        style={{ background: 'var(--surface-solid)', boxShadow: 'var(--shadow-sheet)' }}
        role="alertdialog"
        aria-label={options.title}
      >
        <h3 className="text-base font-semibold text-calm-900">{options.title}</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-calm-700">{options.message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="secondary-button" onClick={() => answer(false)}>
            取消
          </button>
          <button
            type="button"
            className={options.danger ? 'danger-button' : 'primary-button'}
            onClick={() => answer(true)}
          >
            {options.confirmText ?? '确定'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toast

export function ToastHost() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div className="pointer-events-none fixed left-1/2 top-3 z-[60] w-full max-w-sm -translate-x-1/2 space-y-2 px-4">
      {toasts.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => dismiss(item.id)}
          className={`toast-enter pointer-events-auto flex w-full items-start gap-2 rounded-book px-4 py-3 text-left text-sm shadow-[var(--shadow-sheet)] ${
            item.kind === 'error'
              ? 'bg-warm-700 text-white'
              : item.kind === 'success'
                ? 'bg-calm-700 text-white'
                : 'bg-calm-900 text-white'
          }`}
          role="status"
        >
          {item.kind === 'error' ? (
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
          ) : item.kind === 'success' ? (
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          ) : (
            <Info size={16} className="mt-0.5 shrink-0" />
          )}
          <span className="min-w-0 flex-1">{item.text}</span>
        </button>
      ))}
    </div>
  );
}

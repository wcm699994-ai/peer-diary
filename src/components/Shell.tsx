// 应用外壳：桌面端顶部导航 + 移动端底部 Tab 栏（同一套响应式组件）。

import type { ReactNode } from 'react';
import { BookOpen, CalendarDays, Lock, Settings } from 'lucide-react';
import { useLockStore } from '../stores/lockStore';
import { useUiStore, type Tab } from '../stores/uiStore';

const TABS: { key: Tab; label: string; icon: typeof BookOpen }[] = [
  { key: 'write', label: '日记', icon: BookOpen },
  { key: 'timeline', label: '时间轴', icon: CalendarDays },
  { key: 'settings', label: '设置', icon: Settings },
];

export default function Shell({ children }: { children: ReactNode }) {
  const tab = useUiStore((state) => state.tab);
  const setTab = useUiStore((state) => state.setTab);
  const lock = useLockStore((state) => state.lock);

  return (
    <div className="flex min-h-dvh min-w-0 flex-col">
      <header className="sticky top-0 z-20 border-b border-journal-200/70 bg-white/75 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <h1 className="select-none text-lg font-semibold text-calm-800">同行日记</h1>

          {/* 桌面端顶部导航 */}
          <nav className="hidden items-center gap-1 sm:flex" aria-label="主导航">
            {TABS.map(({ key: tabKey, label, icon: Icon }) => (
              <button
                key={tabKey}
                type="button"
                onClick={() => setTab(tabKey)}
                aria-current={tab === tabKey ? 'page' : undefined}
                className={`pill-button ${
                  tab === tabKey ? 'bg-calm-600 text-white shadow-sm' : 'text-calm-600 hover:bg-journal-100'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
            <div className="mx-1 h-5 w-px bg-journal-300" />
            <button
              type="button"
              onClick={lock}
              className="icon-button text-calm-500"
              aria-label="立即锁定"
              title="锁定"
            >
              <Lock size={17} />
            </button>
          </nav>

          {/* 移动端右上角锁定按钮 */}
          <button
            type="button"
            onClick={lock}
            className="icon-button text-calm-500 sm:hidden"
            aria-label="立即锁定"
          >
            <Lock size={19} />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-3xl flex-1 px-4 pb-28 pt-4 sm:px-6 sm:pb-8 sm:pt-5">
        {children}
      </main>

      <footer className="bottom-bar hidden sm:block">这里没有评判，只有理解。</footer>

      {/* 移动端底部 Tab 栏（含刘海屏安全区） */}
      <nav
        className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-journal-200/70 bg-white/92 backdrop-blur-md sm:hidden"
        aria-label="主导航"
      >
        <div className="grid grid-cols-3">
          {TABS.map(({ key: tabKey, label, icon: Icon }) => (
            <button
              key={tabKey}
              type="button"
              onClick={() => setTab(tabKey)}
              aria-current={tab === tabKey ? 'page' : undefined}
              className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] ${
                tab === tabKey ? 'text-calm-700' : 'text-journal-500'
              }`}
            >
              <Icon size={20} strokeWidth={tab === tabKey ? 2.2 : 1.8} />
              <span className={tab === tabKey ? 'font-medium' : ''}>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

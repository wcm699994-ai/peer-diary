// 应用入口：锁定状态机路由 + 页面保挂载切换（切换标签不打断草稿/分析状态）。

import { useEffect, type ReactNode } from 'react';
import LockScreen from './components/LockScreen';
import Onboarding from './components/Onboarding';
import Shell from './components/Shell';
import SettingsPage from './components/SettingsPage';
import TimelinePage from './components/TimelinePage';
import WritePage from './components/WritePage';
import { ConfirmHost, ToastHost } from './components/ui';
import { useLockStore } from './stores/lockStore';
import { useUiStore } from './stores/uiStore';

export default function App() {
  const phase = useLockStore((state) => state.phase);
  const key = useLockStore((state) => state.key);
  const tab = useUiStore((state) => state.tab);

  useEffect(() => {
    void useLockStore.getState().init();
  }, []);

  // 页面隐藏即锁定（与桌面版行为一致）：明文数据只存在于可见会话。
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && useLockStore.getState().phase === 'unlocked') {
        useLockStore.getState().lock();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  if (phase === 'boot') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-journal-50 text-sm text-journal-500">
        正在准备应用…
      </main>
    );
  }

  if (phase === 'onboarding') {
    return (
      <>
        <Onboarding />
        <ToastHost />
      </>
    );
  }

  if (phase === 'locked' || !key) {
    return (
      <>
        <LockScreen />
        <ToastHost />
      </>
    );
  }

  return (
    <>
      <Shell>
        <TabView active={tab === 'write'}>
          <WritePage />
        </TabView>
        <TabView active={tab === 'timeline'}>
          <TimelinePage />
        </TabView>
        <TabView active={tab === 'settings'}>
          <SettingsPage />
        </TabView>
      </Shell>
      <ToastHost />
      <ConfirmHost />
    </>
  );
}

/** 标签页容器：隐藏时保持挂载以保留状态。 */
function TabView({ active, children }: { active: boolean; children: ReactNode }) {
  return <div className={active ? 'page-enter' : 'hidden'}>{children}</div>;
}

// 锁定状态机：boot → (onboarding | locked) → unlocked。
// 解锁密钥只保存在内存；页面隐藏即锁定（App 中监听 visibilitychange）。

import { create } from 'zustand';
import { changePin as dbChangePin, createLock, readLockMeta, verifyPin } from '../lib/db';

export type LockPhase = 'boot' | 'onboarding' | 'locked' | 'unlocked';

interface LockState {
  phase: LockPhase;
  key: CryptoKey | null;
  busy: boolean;
  error: string | null;

  init: () => Promise<void>;
  unlock: (pin: string) => Promise<void>;
  setupPin: (pin: string) => Promise<void>;
  lock: () => void;
  changePin: (oldPin: string, newPin: string) => Promise<void>;
}

export const useLockStore = create<LockState>((set, get) => ({
  phase: 'boot',
  key: null,
  busy: false,
  error: null,

  init: async () => {
    try {
      const meta = await readLockMeta();
      set({ phase: meta ? 'locked' : 'onboarding' });
    } catch {
      // IndexedDB 不可用（如隐私模式的极端限制）：让用户看到明确错误而不是白屏。
      set({ phase: 'onboarding', error: '无法访问浏览器本地数据库（IndexedDB），请检查浏览器设置。' });
    }
  },

  unlock: async (pin) => {
    set({ busy: true, error: null });
    try {
      const key = await verifyPin(pin);
      set({ phase: 'unlocked', key, busy: false, error: null });
    } catch (error) {
      set({ busy: false, error: error instanceof Error ? error.message : 'PIN 不正确' });
    }
  },

  setupPin: async (pin) => {
    set({ busy: true, error: null });
    try {
      const key = await createLock(pin);
      set({ phase: 'unlocked', key, busy: false, error: null });
    } catch (error) {
      set({ busy: false, error: error instanceof Error ? error.message : '设置 PIN 失败' });
    }
  },

  lock: () => {
    set({ phase: 'locked', key: null, error: null });
  },

  changePin: async (oldPin, newPin) => {
    const currentKey = get().key;
    if (!currentKey) return;
    set({ busy: true, error: null });
    try {
      await verifyPin(oldPin);
      const newKey = await dbChangePin(currentKey, newPin);
      set({ key: newKey, busy: false, error: null });
    } catch (error) {
      set({ busy: false });
      throw error;
    }
  },
}));

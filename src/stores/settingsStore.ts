// 设置存 localStorage（明文）。日记内容不在这里——它们在 IndexedDB 里加密。

import { create } from 'zustand';
import { DEEPSEEK_BASE_URL, DEEPSEEK_MODEL, type AiConfig } from '../types';

const STORAGE_KEY = 'pdw.settings.v1';

export const DEFAULT_AI: AiConfig = {
  baseUrl: DEEPSEEK_BASE_URL,
  apiKey: '',
  model: DEEPSEEK_MODEL,
  autoAnalyze: true,
};

interface PersistedSettings {
  ai: AiConfig;
}

function load(): PersistedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedSettings>;
      if (parsed?.ai && typeof parsed.ai === 'object') {
        return { ai: { ...DEFAULT_AI, ...parsed.ai } };
      }
    }
  } catch {
    // 损坏的设置按默认处理
  }
  return { ai: { ...DEFAULT_AI } };
}

function persist(settings: PersistedSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // 隐私模式等场景下写入失败，设置只在本次会话生效
  }
}

interface SettingsState {
  ai: AiConfig;
  updateAi: (patch: Partial<AiConfig>) => void;
  resetAi: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => {
  const initial = load();
  const apply = (ai: AiConfig) => {
    persist({ ai });
    return { ai };
  };
  return {
    ai: initial.ai,
    updateAi: (patch) => set((state) => apply({ ...state.ai, ...patch })),
    resetAi: () => set(apply({ ...DEFAULT_AI })),
  };
});

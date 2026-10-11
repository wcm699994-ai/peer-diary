import { create } from 'zustand';
import { useDiaryStore } from './diaryStore';

export type Tab = 'write' | 'timeline' | 'settings';

interface UiState {
  tab: Tab;
  setTab: (tab: Tab) => void;
  /** 跳到某天的日记（时间轴点击、趋势条点击）。 */
  openDate: (date: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  tab: 'write',
  setTab: (tab) => set({ tab }),
  openDate: (date) => {
    useDiaryStore.getState().setDate(date);
    set({ tab: 'write' });
  },
}));

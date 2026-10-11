// 日记与 AI 分析的当前日期状态。所有解密后的内容只存在于内存。

import { create } from 'zustand';
import { AiError, analyzeEntry } from '../lib/ai';
import * as dbApi from '../lib/db';
import type { DiaryAnalysis, DiaryEntry } from '../types';
import { todayStr } from '../utils/date';
import { useLockStore } from './lockStore';
import { useSettingsStore } from './settingsStore';

export type AnalysisStatus = 'idle' | 'running' | 'done' | 'error' | 'missing-config';

interface DiaryState {
  currentDate: string;
  entry: DiaryEntry | null;
  loading: boolean;
  saving: boolean;
  /** 已保存的日记进入编辑态（表单重新可写）。 */
  editing: boolean;
  analysis: DiaryAnalysis | null;
  analysisStatus: AnalysisStatus;
  analysisError: string | null;
  /** 递增以通知时间轴等页面重新查询。 */
  reloadToken: number;

  setDate: (date: string) => void;
  reload: () => void;
  loadDate: (date: string) => Promise<void>;
  saveContent: (content: string) => Promise<void>;
  startEditing: () => void;
  cancelEditing: () => void;
  deleteCurrent: () => Promise<void>;
  runAnalysis: (date?: string) => Promise<void>;
}

export const useDiaryStore = create<DiaryState>((set, get) => ({
  currentDate: todayStr(),
  entry: null,
  loading: false,
  saving: false,
  editing: false,
  analysis: null,
  analysisStatus: 'idle',
  analysisError: null,
  reloadToken: 0,

  setDate: (date) => {
    if (date === get().currentDate) return;
    set({
      currentDate: date,
      entry: null,
      editing: false,
      analysis: null,
      analysisStatus: 'idle',
      analysisError: null,
      loading: true,
    });
  },

  reload: () => set((state) => ({ reloadToken: state.reloadToken + 1 })),

  loadDate: async (date) => {
    const key = useLockStore.getState().key;
    if (!key) return;
    set({ loading: true });
    try {
      const [entry, analysis] = await Promise.all([
        dbApi.getEntry(key, date),
        dbApi.getAnalysis(key, date),
      ]);
      if (get().currentDate !== date) return;
      set({
        entry,
        analysis,
        loading: false,
        editing: false,
        analysisStatus: analysis ? 'done' : 'idle',
        analysisError: null,
      });
    } catch {
      if (get().currentDate !== date) return;
      set({ entry: null, analysis: null, loading: false });
    }
  },

  saveContent: async (content) => {
    const key = useLockStore.getState().key;
    const date = get().currentDate;
    if (!key) return;
    set({ saving: true });
    try {
      await dbApi.saveEntry(key, date, content);
      await dbApi.deleteDraft(date);
      const entry = await dbApi.getEntry(key, date);
      if (get().currentDate !== date) {
        set({ saving: false });
        return;
      }
      set({ entry, saving: false, editing: false });
      const { ai } = useSettingsStore.getState();
      if (ai.autoAnalyze && ai.apiKey.trim()) {
        void get().runAnalysis(date);
      } else if (!get().analysis) {
        set({ analysisStatus: ai.apiKey.trim() ? 'idle' : 'missing-config' });
      }
    } catch (error) {
      set({ saving: false });
      throw error;
    }
  },

  startEditing: () => set({ editing: true }),

  cancelEditing: () => set({ editing: false }),

  deleteCurrent: async () => {
    const date = get().currentDate;
    await dbApi.deleteEntryAll(date);
    if (get().currentDate === date) {
      set({
        entry: null,
        analysis: null,
        editing: false,
        analysisStatus: 'idle',
        analysisError: null,
      });
    }
    get().reload();
  },

  runAnalysis: async (dateArg) => {
    const date = dateArg ?? get().currentDate;
    const key = useLockStore.getState().key;
    const { ai } = useSettingsStore.getState();
    if (!key) return;

    let content: string | undefined;
    if (date === get().currentDate) {
      content = get().entry?.content;
      if (!content?.trim()) return;
      set({ analysisStatus: 'running', analysisError: null });
    } else {
      content = (await dbApi.getEntry(key, date))?.content;
      if (!content?.trim()) return;
    }

    try {
      const analysis = await analyzeEntry(ai, date, content);
      await dbApi.saveAnalysis(key, analysis);
      if (get().currentDate === date) {
        set({ analysis, analysisStatus: 'done', analysisError: null });
      }
      get().reload();
    } catch (error) {
      if (get().currentDate !== date) return;
      const message = error instanceof AiError || error instanceof Error
        ? error.message
        : '分析失败，请稍后重试。';
      set({ analysisStatus: 'error', analysisError: message });
    }
  },
}));

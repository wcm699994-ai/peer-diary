import { create } from 'zustand';

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'success' | 'error';
}

interface ToastState {
  toasts: Toast[];
  show: (text: string, kind?: Toast['kind']) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (text, kind = 'info') => {
    const id = nextId;
    nextId += 1;
    set((state) => ({ toasts: [...state.toasts.slice(-2), { id, text, kind }] }));
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) }));
    }, 4000);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
}));

export const toast = (text: string, kind: Toast['kind'] = 'info'): void => {
  useToastStore.getState().show(text, kind);
};

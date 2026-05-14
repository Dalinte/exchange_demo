import { create } from 'zustand';
import type { Toast } from '@/features/trade-terminal/types';

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

const TOAST_TTL_MS = 4000;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    const handle = setTimeout(() => get().dismiss(id), TOAST_TTL_MS);
    timers.set(id, handle);
  },
  dismiss: (id) => {
    const handle = timers.get(id);
    if (handle) {
      clearTimeout(handle);
      timers.delete(id);
    }
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

export function usePushToast() {
  return useToastStore((s) => s.push);
}

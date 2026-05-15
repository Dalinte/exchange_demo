import { create } from 'zustand';
import type { ConnectionState } from '@/shared/ws/client';

interface WsState {
  state: ConnectionState;
  latencyMs: number | null;
  setConnectionState: (state: ConnectionState) => void;
  setLatency: (latencyMs: number | null) => void;
}

export const useWsStore = create<WsState>((set) => ({
  state: 'closed',
  latencyMs: null,
  setConnectionState: (state) => set({ state }),
  setLatency: (latencyMs) => set({ latencyMs }),
}));

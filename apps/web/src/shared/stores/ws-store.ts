import { create } from 'zustand';
import type { ConnectionState } from '@/shared/ws/client';

interface WsState {
  state: ConnectionState;
  setConnectionState: (state: ConnectionState) => void;
}

export const useWsStore = create<WsState>((set) => ({
  state: 'closed',
  setConnectionState: (state) => set({ state }),
}));

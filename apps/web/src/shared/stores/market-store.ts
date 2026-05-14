import { create } from 'zustand';

interface MarketState {
  symbol: string;
  setSymbol: (symbol: string) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  symbol: 'BTCUSDT',
  setSymbol: (symbol) => set({ symbol }),
}));

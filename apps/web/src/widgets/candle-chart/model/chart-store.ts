import { create } from 'zustand';
import type { KlineInterval } from '@exchange/shared';

export type ChartType = 'candles' | 'bars' | 'line' | 'area';

interface ChartState {
  interval: KlineInterval;
  chartType: ChartType;
  setInterval: (interval: KlineInterval) => void;
  setChartType: (chartType: ChartType) => void;
}

export const useChartStore = create<ChartState>((set) => ({
  interval: '15m',
  chartType: 'candles',
  setInterval: (interval) => set({ interval }),
  setChartType: (chartType) => set({ chartType }),
}));

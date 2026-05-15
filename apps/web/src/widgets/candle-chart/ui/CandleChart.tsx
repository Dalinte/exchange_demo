'use client';

import { KlineChartView, useKlineStream, useKlines } from '@/entities/kline';
import { useMarketStore } from '@/entities/trading-pair';
import { useChartStore } from '../model/chart-store';
import { ChartToolbar } from './ChartToolbar';

export function CandleChart() {
  const symbol = useMarketStore((state) => state.symbol);
  const interval = useChartStore((state) => state.interval);
  const chartType = useChartStore((state) => state.chartType);
  const { data: candles = [] } = useKlines(symbol, interval);

  useKlineStream(symbol, interval);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ChartToolbar candles={candles} />
      <KlineChartView candles={candles} chartType={chartType} />
    </div>
  );
}

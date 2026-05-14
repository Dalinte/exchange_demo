'use client';

import { KlineChartView, useKlineStream, useKlines } from '@/entities/kline';
import { useMarketStore } from '@/entities/trading-pair';
import { useChartStore } from '../model/chart-store';
import { ChartToolbar } from './ChartToolbar';

export function CandleChart() {
  const symbol = useMarketStore((state) => state.symbol);
  const interval = useChartStore((state) => state.interval);
  const chartType = useChartStore((state) => state.chartType);
  useKlineStream(symbol, interval);
  const { data: candles = [] } = useKlines(symbol, interval);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <ChartToolbar candles={candles} />
      <KlineChartView candles={candles} chartType={chartType} />
    </div>
  );
}

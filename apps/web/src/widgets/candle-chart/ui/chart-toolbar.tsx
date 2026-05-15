'use client';

import type { Kline } from '@exchange/shared';
import { formatPrice } from '@/shared/lib/format';
import { KLINE_INTERVALS } from '../model/intervals';
import { useChartStore, type ChartType } from '../model/chart-store';

interface ChartToolbarProps {
  candles: Kline[];
}

const CHART_TYPE_OPTIONS: readonly { value: ChartType; label: string }[] = [
  { value: 'candles', label: 'Candles' },
  { value: 'bars', label: 'Bars' },
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
];

export function ChartToolbar({ candles }: ChartToolbarProps) {
  const interval = useChartStore((state) => state.interval);
  const setInterval = useChartStore((state) => state.setInterval);
  const chartType = useChartStore((state) => state.chartType);
  const setChartType = useChartStore((state) => state.setChartType);

  return (
    <div className="flex items-center gap-1 px-2.5 py-1.5 border-b border-border bg-bg-1 shrink-0 h-9">
      <div className="flex">
        {KLINE_INTERVALS.map((value) => (
          <button
            key={value}
            className={'tf ' + (interval === value ? 'active' : '')}
            onClick={() => setInterval(value)}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="w-px h-4 bg-border mx-2" />
      <div className="flex">
        {CHART_TYPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            className={'tf ' + (chartType === option.value ? 'active' : '')}
            onClick={() => setChartType(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="flex-1" />
      {candles.length > 0 && <LastCandleStats candles={candles} />}
    </div>
  );
}

function LastCandleStats({ candles }: { candles: Kline[] }) {
  const last = candles[candles.length - 1];
  const isUp = Number(last.close) >= Number(last.open);
  const colorClass = isUp ? 'text-up' : 'text-down';
  return (
    <>
      <span className="text-[11px] text-text-2">O</span>
      <span className={'mono text-[11px] ' + colorClass}>{formatPrice(last.open)}</span>
      <span className="text-[11px] text-text-2 ml-2">H</span>
      <span className={'mono text-[11px] ' + colorClass}>{formatPrice(last.high)}</span>
      <span className="text-[11px] text-text-2 ml-2">L</span>
      <span className={'mono text-[11px] ' + colorClass}>{formatPrice(last.low)}</span>
      <span className="text-[11px] text-text-2 ml-2">C</span>
      <span className={'mono text-[11px] ' + colorClass}>{formatPrice(last.close)}</span>
    </>
  );
}

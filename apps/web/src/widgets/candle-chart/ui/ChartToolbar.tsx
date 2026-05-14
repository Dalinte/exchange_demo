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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '6px 10px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-1)',
        flexShrink: 0,
        height: 36,
      }}
    >
      <div style={{ display: 'flex', gap: 0 }}>
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
      <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 8px' }} />
      <div style={{ display: 'flex', gap: 0 }}>
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
      <div style={{ flex: 1 }} />
      {candles.length > 0 && <LastCandleStats candles={candles} />}
    </div>
  );
}

function LastCandleStats({ candles }: { candles: Kline[] }) {
  const last = candles[candles.length - 1];
  const isUp = Number(last.close) >= Number(last.open);
  const color = isUp ? 'var(--up)' : 'var(--down)';
  return (
    <>
      <span style={{ fontSize: 11, color: 'var(--text-2)' }}>O</span>
      <span className="mono" style={{ fontSize: 11, color }}>
        {formatPrice(last.open)}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-2)', marginLeft: 8 }}>H</span>
      <span className="mono" style={{ fontSize: 11, color }}>
        {formatPrice(last.high)}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-2)', marginLeft: 8 }}>L</span>
      <span className="mono" style={{ fontSize: 11, color }}>
        {formatPrice(last.low)}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-2)', marginLeft: 8 }}>C</span>
      <span className="mono" style={{ fontSize: 11, color }}>
        {formatPrice(last.close)}
      </span>
    </>
  );
}

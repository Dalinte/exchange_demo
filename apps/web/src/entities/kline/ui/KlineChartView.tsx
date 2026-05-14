'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AreaSeries,
  BarSeries,
  CandlestickSeries,
  createChart,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Kline } from '@exchange/shared';
import { formatPrice } from '@/shared/lib/format';

export type ChartType = 'candles' | 'bars' | 'line' | 'area';

const UP = '#0ecb81';
const DOWN = '#f6465d';
const UP_VOL = 'rgba(14, 203, 129, 0.55)';
const DOWN_VOL = 'rgba(246, 70, 93, 0.55)';
const BG = '#0a0a0a';
const GRID = '#1c1f27';
const TEXT = '#888888';
const BORDER = '#2a2a2a';
const PRICE_SCALE_MARGINS = { top: 0.05, bottom: 0.25 };
const VOLUME_SCALE_MARGINS = { top: 0.8, bottom: 0 };

interface KlineChartViewProps {
  candles: Kline[];
  chartType: ChartType;
}

interface PriceSeries {
  remove: () => void;
  setAll: (candles: Kline[]) => void;
  updateBar: (kline: Kline) => void;
}

interface HoverOhlc {
  open: number;
  high: number;
  low: number;
  close: number;
}

function toUtcTimestamp(openTimeMs: number): UTCTimestamp {
  return Math.floor(openTimeMs / 1000) as UTCTimestamp;
}

function toOhlcPoint(kline: Kline) {
  return {
    time: toUtcTimestamp(kline.openTime),
    open: Number(kline.open),
    high: Number(kline.high),
    low: Number(kline.low),
    close: Number(kline.close),
  };
}

function toLinePoint(kline: Kline) {
  return {
    time: toUtcTimestamp(kline.openTime),
    value: Number(kline.close),
  };
}

function toVolumePoint(kline: Kline) {
  return {
    time: toUtcTimestamp(kline.openTime),
    value: Number(kline.volume),
    color: Number(kline.close) >= Number(kline.open) ? UP_VOL : DOWN_VOL,
  };
}

function createPriceSeries(chart: IChartApi, chartType: ChartType): PriceSeries {
  if (chartType === 'candles') {
    const series = chart.addSeries(CandlestickSeries, {
      upColor: UP,
      downColor: DOWN,
      borderVisible: false,
      wickUpColor: UP,
      wickDownColor: DOWN,
    });
    series.priceScale().applyOptions({ scaleMargins: PRICE_SCALE_MARGINS });
    return {
      remove: () => chart.removeSeries(series),
      setAll: (data) => series.setData(data.map(toOhlcPoint)),
      updateBar: (kline) => series.update(toOhlcPoint(kline)),
    };
  }

  if (chartType === 'bars') {
    const series = chart.addSeries(BarSeries, {
      upColor: UP,
      downColor: DOWN,
    });
    series.priceScale().applyOptions({ scaleMargins: PRICE_SCALE_MARGINS });
    return {
      remove: () => chart.removeSeries(series),
      setAll: (data) => series.setData(data.map(toOhlcPoint)),
      updateBar: (kline) => series.update(toOhlcPoint(kline)),
    };
  }

  if (chartType === 'line') {
    const series = chart.addSeries(LineSeries, {
      color: UP,
      lineWidth: 2,
    });
    series.priceScale().applyOptions({ scaleMargins: PRICE_SCALE_MARGINS });
    return {
      remove: () => chart.removeSeries(series),
      setAll: (data) => series.setData(data.map(toLinePoint)),
      updateBar: (kline) => series.update(toLinePoint(kline)),
    };
  }

  const series = chart.addSeries(AreaSeries, {
    lineColor: UP,
    topColor: 'rgba(14, 203, 129, 0.35)',
    bottomColor: 'rgba(14, 203, 129, 0)',
    lineWidth: 2,
  });
  series.priceScale().applyOptions({ scaleMargins: PRICE_SCALE_MARGINS });
  return {
    remove: () => chart.removeSeries(series),
    setAll: (data) => series.setData(data.map(toLinePoint)),
    updateBar: (kline) => series.update(toLinePoint(kline)),
  };
}

export function KlineChartView({ candles, chartType }: KlineChartViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const priceSeriesRef = useRef<PriceSeries | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const firstOpenTimeRef = useRef<number | undefined>(undefined);
  const candlesRef = useRef<Kline[]>(candles);

  const [hover, setHover] = useState<HoverOhlc | null>(null);

  const candleByTime = useMemo(() => {
    const map = new Map<number, Kline>();
    for (const kline of candles) map.set(toUtcTimestamp(kline.openTime), kline);
    return map;
  }, [candles]);
  const candleByTimeRef = useRef(candleByTime);

  useEffect(() => {
    candlesRef.current = candles;
    candleByTimeRef.current = candleByTime;
  }, [candles, candleByTime]);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: BG },
        textColor: TEXT,
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
      },
      grid: {
        vertLines: { color: GRID },
        horzLines: { color: GRID },
      },
      rightPriceScale: { borderColor: BORDER },
      timeScale: {
        borderColor: BORDER,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#5a5a5a', style: 3, width: 1 },
        horzLine: { color: '#5a5a5a', style: 3, width: 1 },
      },
    });
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    volumeSeries.priceScale().applyOptions({ scaleMargins: VOLUME_SCALE_MARGINS });

    chart.subscribeCrosshairMove((param) => {
      if (typeof param.time !== 'number') {
        setHover(null);
        return;
      }
      const kline = candleByTimeRef.current.get(param.time);
      if (!kline) {
        setHover(null);
        return;
      }
      setHover({
        open: Number(kline.open),
        high: Number(kline.high),
        low: Number(kline.low),
        close: Number(kline.close),
      });
    });

    chartRef.current = chart;
    volumeSeriesRef.current = volumeSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      volumeSeriesRef.current = null;
      priceSeriesRef.current = null;
      firstOpenTimeRef.current = undefined;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    const volumeSeries = volumeSeriesRef.current;
    if (!chart || !volumeSeries) return;
    priceSeriesRef.current?.remove();
    const series = createPriceSeries(chart, chartType);
    priceSeriesRef.current = series;
    const data = candlesRef.current;
    if (data.length > 0) {
      series.setAll(data);
      volumeSeries.setData(data.map(toVolumePoint));
      firstOpenTimeRef.current = data[0].openTime;
      chart.timeScale().fitContent();
    } else {
      firstOpenTimeRef.current = undefined;
    }
  }, [chartType]);

  useEffect(() => {
    const chart = chartRef.current;
    const priceSeries = priceSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    if (!chart || !priceSeries || !volumeSeries) return;
    if (candles.length === 0) {
      firstOpenTimeRef.current = undefined;
      return;
    }

    const first = candles[0].openTime;
    const isSnapshot = firstOpenTimeRef.current === undefined || firstOpenTimeRef.current !== first;

    if (isSnapshot) {
      priceSeries.setAll(candles);
      volumeSeries.setData(candles.map(toVolumePoint));
      chart.timeScale().fitContent();
    } else {
      const lastCandle = candles[candles.length - 1];
      priceSeries.updateBar(lastCandle);
      volumeSeries.update(toVolumePoint(lastCandle));
    }
    firstOpenTimeRef.current = first;
  }, [candles]);

  return (
    <div
      style={{
        flex: 1,
        position: 'relative',
        minHeight: 0,
        background: 'var(--bg-0)',
      }}
    >
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {hover && (
        <div
          style={{
            position: 'absolute',
            left: 8,
            top: 8,
            background: 'rgba(20,23,31,0.92)',
            border: '1px solid var(--border)',
            padding: '6px 10px',
            fontSize: 11,
            borderRadius: 3,
            display: 'flex',
            gap: 12,
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          <span style={{ color: 'var(--text-2)' }}>
            O{' '}
            <span className="mono" style={{ color: 'var(--text-0)' }}>
              {formatPrice(hover.open)}
            </span>
          </span>
          <span style={{ color: 'var(--text-2)' }}>
            H <span className="mono up">{formatPrice(hover.high)}</span>
          </span>
          <span style={{ color: 'var(--text-2)' }}>
            L <span className="mono down">{formatPrice(hover.low)}</span>
          </span>
          <span style={{ color: 'var(--text-2)' }}>
            C{' '}
            <span
              className="mono"
              style={{ color: hover.close >= hover.open ? 'var(--up)' : 'var(--down)' }}
            >
              {formatPrice(hover.close)}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

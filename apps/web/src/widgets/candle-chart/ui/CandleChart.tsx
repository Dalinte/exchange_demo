'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Kline } from '@exchange/shared';
import { useTickerBySymbol } from '@/shared/api/hooks/use-tickers';
import { useKlines } from '@/shared/api/hooks/use-klines';
import { useKlineStream } from '@/shared/ws/use-kline-stream';
import { formatDecimal, formatPrice } from '@/shared/lib/format';
import { useMarketStore } from '@/shared/stores/market-store';
import { TIMEFRAMES, type Timeframe } from '../model/timeframes';

interface CandleChartProps {
  timeframe: Timeframe;
  onTimeframe: (tf: Timeframe) => void;
}

interface HoverState {
  x: number;
  y: number;
  idx: number;
  candle: Kline;
}

export function CandleChart({ timeframe, onTimeframe }: CandleChartProps) {
  const symbol = useMarketStore((s) => s.symbol);
  useKlineStream(symbol, timeframe);
  const { data: candles = [] } = useKlines(symbol, timeframe);
  const { data: ticker } = useTickerBySymbol(symbol);
  const volume24h = ticker?.volume24h ?? '0';

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 800, h: 360 });
  const [hover, setHover] = useState<HoverState | null>(null);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const cr = e.contentRect;
        setSize({ w: Math.floor(cr.width), h: Math.floor(cr.height) });
      }
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const PAD_L = 0;
  const PAD_R = 64;
  const PAD_T = 12;
  const PAD_B = 28;
  const VOL_H = 56;
  const chartH = size.h - PAD_T - PAD_B - VOL_H - 6;
  const chartW = size.w - PAD_L - PAD_R;

  const stats = useMemo(() => {
    if (!candles.length) return null;
    let lo = Infinity;
    let hi = -Infinity;
    let vMax = 0;
    for (const c of candles) {
      const low = Number(c.low);
      const high = Number(c.high);
      const vol = Number(c.volume);
      if (low < lo) lo = low;
      if (high > hi) hi = high;
      if (vol > vMax) vMax = vol;
    }
    const pad = (hi - lo) * 0.06;
    return { lo: lo - pad, hi: hi + pad, vMax };
  }, [candles]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
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
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              className={'tf ' + (timeframe === tf ? 'active' : '')}
              onClick={() => onTimeframe(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 8px' }} />
        <button className="tf" data-tip="Indicators (mock)">
          Indicators
        </button>
        <button className="tf" data-tip="Drawing tools (mock)">
          Tools
        </button>
        <div style={{ flex: 1 }} />
        {candles.length > 0 && <CandleHeaderStats candles={candles} />}
      </div>

      {!stats || size.w < 60 || candles.length === 0 ? (
        <div ref={wrapRef} style={{ flex: 1, position: 'relative', minHeight: 200 }} />
      ) : (
        <CandleSvg
          wrapRef={wrapRef}
          candles={candles}
          stats={stats}
          size={size}
          chartW={chartW}
          chartH={chartH}
          PAD_L={PAD_L}
          PAD_T={PAD_T}
          PAD_B={PAD_B}
          VOL_H={VOL_H}
          volume24h={volume24h}
          hover={hover}
          setHover={setHover}
        />
      )}
    </div>
  );
}

function CandleHeaderStats({ candles }: { candles: Kline[] }) {
  const last = candles[candles.length - 1];
  const lastUp = Number(last.close) >= Number(last.open);
  const color = lastUp ? 'var(--up)' : 'var(--down)';
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

interface CandleSvgProps {
  wrapRef: React.RefObject<HTMLDivElement | null>;
  candles: Kline[];
  stats: { lo: number; hi: number; vMax: number };
  size: { w: number; h: number };
  chartW: number;
  chartH: number;
  PAD_L: number;
  PAD_T: number;
  PAD_B: number;
  VOL_H: number;
  volume24h: string;
  hover: HoverState | null;
  setHover: (h: HoverState | null) => void;
}

function CandleSvg({
  wrapRef,
  candles,
  stats,
  size,
  chartW,
  chartH,
  PAD_L,
  PAD_T,
  PAD_B,
  VOL_H,
  volume24h,
  hover,
  setHover,
}: CandleSvgProps) {
  const { lo, hi, vMax } = stats;
  const N = candles.length;
  const slot = chartW / N;
  const cw = Math.max(2, slot * 0.62);
  const yScale = (p: number) => PAD_T + (1 - (p - lo) / (hi - lo)) * chartH;

  const ticks = 5;
  const tickVals: number[] = [];
  for (let i = 0; i <= ticks; i++) tickVals.push(lo + (hi - lo) * (i / ticks));

  const lastCandle = candles[N - 1];
  const lastCloseNum = Number(lastCandle.close);
  const lastUp = lastCloseNum >= Number(lastCandle.open);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const idx = Math.max(0, Math.min(N - 1, Math.floor((x - PAD_L) / slot)));
    setHover({ x, y, idx, candle: candles[idx] });
  }

  const xLabelPositions = [0, 0.25, 0.5, 0.75, 0.99];

  return (
    <div
      ref={wrapRef}
      style={{ flex: 1, position: 'relative', minHeight: 0, background: 'var(--bg-0)' }}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      <svg width={size.w} height={size.h} style={{ display: 'block' }}>
        {tickVals.map((v, i) => (
          <g key={i}>
            <line
              x1={0}
              x2={chartW}
              y1={yScale(v)}
              y2={yScale(v)}
              stroke="#1c1f27"
              strokeDasharray="2 4"
            />
            <text
              x={chartW + 6}
              y={yScale(v) + 3}
              fill="var(--text-2)"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
            >
              {formatPrice(v)}
            </text>
          </g>
        ))}

        {candles.map((c, i) => {
          const x = PAD_L + i * slot + slot / 2;
          const open = Number(c.open);
          const close = Number(c.close);
          const high = Number(c.high);
          const low = Number(c.low);
          const isUp = close >= open;
          const color = isUp ? 'var(--up)' : 'var(--down)';
          const yOpen = yScale(open);
          const yClose = yScale(close);
          const yHigh = yScale(high);
          const yLow = yScale(low);
          const bodyTop = Math.min(yOpen, yClose);
          const bodyH = Math.max(1, Math.abs(yClose - yOpen));
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={yHigh} y2={yLow} stroke={color} strokeWidth="1" />
              <rect x={x - cw / 2} y={bodyTop} width={cw} height={bodyH} fill={color} />
            </g>
          );
        })}

        <line
          x1={0}
          x2={chartW}
          y1={yScale(lastCloseNum)}
          y2={yScale(lastCloseNum)}
          stroke={lastUp ? 'var(--up)' : 'var(--down)'}
          strokeDasharray="3 3"
          opacity="0.5"
        />
        <rect
          x={chartW + 1}
          y={yScale(lastCloseNum) - 8}
          width={62}
          height={16}
          fill={lastUp ? 'var(--up)' : 'var(--down)'}
          rx="2"
        />
        <text
          x={chartW + 32}
          y={yScale(lastCloseNum) + 3}
          fill="#fff"
          fontSize="10"
          fontFamily="JetBrains Mono, monospace"
          textAnchor="middle"
          fontWeight="600"
        >
          {formatPrice(lastCandle.close)}
        </text>

        {candles.map((c, i) => {
          const x = PAD_L + i * slot + slot / 2;
          const open = Number(c.open);
          const close = Number(c.close);
          const volume = Number(c.volume);
          const isUp = close >= open;
          const color = isUp ? 'var(--up)' : 'var(--down)';
          const baseY = size.h - PAD_B;
          const h = (volume / vMax) * VOL_H;
          return (
            <rect
              key={'v' + i}
              x={x - cw / 2}
              y={baseY - h}
              width={cw}
              height={h}
              fill={color}
              opacity="0.55"
            />
          );
        })}

        <text
          x={4}
          y={size.h - PAD_B - VOL_H + 12}
          fill="var(--text-2)"
          fontSize="10"
          fontFamily="JetBrains Mono, monospace"
        >
          Vol {formatDecimal(volume24h, 2)}
        </text>

        {xLabelPositions.map((p, i) => {
          const idx = Math.floor(p * (N - 1));
          const x = PAD_L + idx * slot + slot / 2;
          const label = new Date(candles[idx].openTime).toUTCString().slice(17, 22);
          return (
            <text
              key={'t' + i}
              x={x}
              y={size.h - 8}
              fill="var(--text-2)"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
              textAnchor="middle"
            >
              {label}
            </text>
          );
        })}

        {hover && hover.y > PAD_T && hover.y < size.h - PAD_B && (
          <g pointerEvents="none">
            <line
              x1={hover.x}
              x2={hover.x}
              y1={PAD_T}
              y2={size.h - PAD_B}
              stroke="var(--text-3)"
              strokeDasharray="2 3"
              opacity="0.7"
            />
            <line
              x1={0}
              x2={chartW}
              y1={hover.y}
              y2={hover.y}
              stroke="var(--text-3)"
              strokeDasharray="2 3"
              opacity="0.7"
            />
            <rect
              x={chartW + 1}
              y={hover.y - 8}
              width={62}
              height={16}
              fill="var(--bg-3)"
              stroke="var(--border-strong)"
              rx="2"
            />
            <text
              x={chartW + 32}
              y={hover.y + 3}
              fill="var(--text-0)"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
              textAnchor="middle"
            >
              {formatPrice(hi - ((hover.y - PAD_T) / chartH) * (hi - lo))}
            </text>
          </g>
        )}
      </svg>

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
          }}
        >
          <span style={{ color: 'var(--text-2)' }}>
            O{' '}
            <span className="mono" style={{ color: 'var(--text-0)' }}>
              {formatPrice(hover.candle.open)}
            </span>
          </span>
          <span style={{ color: 'var(--text-2)' }}>
            H <span className="mono up">{formatPrice(hover.candle.high)}</span>
          </span>
          <span style={{ color: 'var(--text-2)' }}>
            L <span className="mono down">{formatPrice(hover.candle.low)}</span>
          </span>
          <span style={{ color: 'var(--text-2)' }}>
            C{' '}
            <span
              className="mono"
              style={{
                color:
                  Number(hover.candle.close) >= Number(hover.candle.open)
                    ? 'var(--up)'
                    : 'var(--down)',
              }}
            >
              {formatPrice(hover.candle.close)}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

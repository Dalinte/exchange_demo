'use client';

import { type ReactNode } from 'react';
import { RotateCcw, Star } from 'lucide-react';
import { useBalances, calculateTotalEquityUsdt } from '@/entities/balance';
import { useTickers, TickerSubscription, isPositiveChange } from '@/entities/ticker';
import { useMarketStore } from '@/entities/trading-pair';
import { formatDecimal, formatPrice, formatSignedPercent } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { PairPicker } from '@/features/select-trading-pair';
import { Brand } from './brand';

interface TopBarProps {
  onReset: () => void;
}

export function TopBar({ onReset }: TopBarProps) {
  const symbol = useMarketStore((store) => store.symbol);
  const { data: tickers } = useTickers();
  const { data: balances } = useBalances();

  const active = tickers?.find((ticker) => ticker.symbol === symbol);
  const isPriceUp = active ? isPositiveChange(active.priceChangePercent24h) : true;
  const totalEquity = calculateTotalEquityUsdt(balances);

  return (
    <div className="flex items-center h-[60px] shrink-0 px-4 border-b border-border bg-bg-1">
      <Brand />

      <div className="w-px h-8 bg-border mx-4" />

      <div className="flex items-center gap-7 flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <PairPicker />
          <button className="btn btn-ghost h-[22px] px-1.5 text-[11px]" data-tip="Add to favorites">
            <Star size={12} />
          </button>
        </div>

        <div
          className={cn(
            'mono text-[length:var(--fs-price)] font-semibold tracking-tight',
            isPriceUp ? 'text-up' : 'text-down',
          )}
        >
          {active ? formatPrice(active.lastPrice) : '—'}
        </div>

        <Stat label="24h Change" className={cn('mono', isPriceUp ? 'text-up' : 'text-down')}>
          {active ? formatSignedPercent(active.priceChangePercent24h) : '—'}
        </Stat>
        <Stat label="24h High" className="mono">
          {active ? formatPrice(active.highPrice24h) : '—'}
        </Stat>
        <Stat label="24h Low" className="mono">
          {active ? formatPrice(active.lowPrice24h) : '—'}
        </Stat>
        <Stat label={`24h Volume(${active?.baseAsset ?? ''})`} className="mono">
          {active ? formatDecimal(active.volume24h, 2) : '—'}
        </Stat>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Stat label="Portfolio" align="right" className="mono text-[15px] font-semibold">
          {formatDecimal(totalEquity, 2)}{' '}
          <span className="text-text-2 text-[11px] font-normal">USDT</span>
        </Stat>
        <button className="btn btn-ghost" onClick={onReset} data-tip="Reset paper-trading balance">
          <RotateCcw size={13} /> Reset
        </button>
      </div>

      {(tickers ?? []).map((ticker) => (
        <TickerSubscription key={ticker.symbol} symbol={ticker.symbol} />
      ))}
    </div>
  );
}

interface StatProps {
  label: string;
  children: ReactNode;
  className?: string;
  align?: 'left' | 'right';
}

function Stat({ label, children, className, align = 'left' }: StatProps) {
  return (
    <div className={cn('flex flex-col gap-0.5', align === 'right' && 'text-right')}>
      <div className="text-[10px] text-text-2 uppercase tracking-wider">{label}</div>
      <div className={cn('text-[12px] font-medium', className)}>{children}</div>
    </div>
  );
}

'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, RotateCcw, Search, Star } from 'lucide-react';
import { useBalances, calculateTotalEquityUsdt } from '@/entities/balance';
import { useTickers, TickerSubscription } from '@/entities/ticker';
import { useMarketStore, formatPairDisplay } from '@/entities/trading-pair';
import { formatDecimal, formatPrice, formatSignedPercent } from '@/shared/lib/format';

interface TopBarProps {
  onReset: () => void;
}

export function TopBar({ onReset }: TopBarProps) {
  const symbol = useMarketStore((s) => s.symbol);
  const router = useRouter();
  const { data: tickers } = useTickers();
  const { data: balances } = useBalances();

  const active = tickers?.find((t) => t.symbol === symbol);
  const chgPos = active ? Number(active.priceChangePercent24h) >= 0 : true;
  const totalEquity = calculateTotalEquityUsdt(balances);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setPickerOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPickerOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [pickerOpen]);

  const q = query.toLowerCase();
  const filtered = (tickers ?? []).filter(
    (t) => t.symbol.toLowerCase().includes(q) || t.baseAsset.toLowerCase().includes(q),
  );

  return (
    <div className="flex items-center h-[60px] shrink-0 px-4 border-b border-border bg-bg-1">
      <div className="flex items-center gap-3 shrink-0">
        <span className="logo-mark">D</span>
        <span className="text-[15px] font-bold tracking-tight">Demo Exchange</span>
        <span className="badge">PAPER</span>
      </div>

      <div className="w-px h-8 bg-border mx-4" />

      <div className="flex items-center gap-7 flex-1 min-w-0">
        <div ref={wrapRef} className="relative flex items-center gap-1.5">
          <button
            onClick={() => setPickerOpen((o) => !o)}
            className={
              'flex items-center gap-2 rounded-sm border px-2.5 py-1.5 text-base font-semibold text-text-0 ' +
              (pickerOpen ? 'bg-bg-3 border-border-strong' : 'bg-transparent border-border')
            }
          >
            <span>{active ? formatPairDisplay(active) : '...'}</span>
            <span className="inline-flex text-text-2">
              <ChevronDown size={12} />
            </span>
          </button>
          <button className="btn btn-ghost h-[22px] px-1.5 text-[11px]" data-tip="Add to favorites">
            <Star size={12} />
          </button>

          {pickerOpen && (
            <div className="absolute left-0 top-[calc(100%+6px)] z-[200] flex max-h-[420px] w-80 flex-col overflow-hidden rounded-md border border-border-strong bg-bg-2 shadow-[0_12px_36px_rgba(0,0,0,.5)]">
              <div className="p-2.5 border-b border-border">
                <div className="search-wrap">
                  <span className="text-text-3">
                    <Search size={13} />
                  </span>
                  <input
                    autoFocus
                    className="field"
                    placeholder="Search pairs"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-[1fr_100px_60px] px-3 py-1.5 text-[10px] text-text-2 uppercase tracking-wider border-b border-border bg-bg-1">
                <span>Pair</span>
                <span className="text-right">Last</span>
                <span className="text-right">24h%</span>
              </div>

              <div className="flex-1 overflow-y-auto">
                {tickers === undefined && (
                  <div className="grid grid-cols-[1fr_100px_60px] px-3 py-2 text-[12px] text-text-3">
                    <span>Loading…</span>
                    <span />
                    <span />
                  </div>
                )}
                {tickers !== undefined &&
                  filtered.map((t) => {
                    const isActive = t.symbol === symbol;
                    const pos = Number(t.priceChangePercent24h) >= 0;
                    return (
                      <div
                        key={t.symbol}
                        className={
                          'pair-row ' +
                          (isActive ? 'active ' : '') +
                          'grid grid-cols-[1fr_100px_60px] px-3 py-2 text-[12px] cursor-default border-l-2 ' +
                          (isActive ? 'border-accent-line' : 'border-transparent')
                        }
                        onClick={() => {
                          router.push(`/trade/${t.symbol}`);
                          setPickerOpen(false);
                          setQuery('');
                        }}
                      >
                        <span className={isActive ? 'text-text-0' : 'text-text-1'}>
                          <span className="font-medium">{t.baseAsset}</span>
                          <span className="text-text-3">/{t.quoteAsset}</span>
                        </span>
                        <span className="mono text-right text-text-0">
                          {formatPrice(t.lastPrice)}
                        </span>
                        <span className={'mono text-right text-[11px] ' + (pos ? 'up' : 'down')}>
                          {formatSignedPercent(t.priceChangePercent24h)}
                        </span>
                      </div>
                    );
                  })}
                {tickers !== undefined && filtered.length === 0 && (
                  <div className="p-6 text-center text-text-3 text-[11px]">
                    No pairs match &quot;{query}&quot;
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div
          className={
            'mono text-[length:var(--fs-price)] font-semibold tracking-tight ' +
            (chgPos ? 'text-up' : 'text-down')
          }
        >
          {active ? formatPrice(active.lastPrice) : '—'}
        </div>

        <Stat label="24h Change" mono className={chgPos ? 'up' : 'down'}>
          {active ? formatSignedPercent(active.priceChangePercent24h) : '—'}
        </Stat>
        <Stat label="24h High" mono>
          {active ? formatPrice(active.highPrice24h) : '—'}
        </Stat>
        <Stat label="24h Low" mono>
          {active ? formatPrice(active.lowPrice24h) : '—'}
        </Stat>
        <Stat label={`24h Volume(${active?.baseAsset ?? ''})`} mono>
          {active ? formatDecimal(active.volume24h, 2) : '—'}
        </Stat>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <div className="text-[10px] text-text-2 uppercase tracking-wider">Portfolio</div>
          <div className="mono text-[15px] font-semibold">
            {formatDecimal(totalEquity, 2)}{' '}
            <span className="text-text-2 text-[11px] font-normal">USDT</span>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={onReset} data-tip="Reset paper-trading balance">
          <RotateCcw size={13} /> Reset
        </button>
      </div>

      {(tickers ?? []).map((t) => (
        <TickerSubscription key={t.symbol} symbol={t.symbol} />
      ))}
    </div>
  );
}

interface StatProps {
  label: string;
  children: ReactNode;
  className?: string;
  mono?: boolean;
}

function Stat({ label, children, className, mono }: StatProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[10px] text-text-2 uppercase tracking-wider">{label}</div>
      <div className={'text-[12px] font-medium ' + (mono ? 'mono ' : '') + (className || '')}>
        {children}
      </div>
    </div>
  );
}

'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/shared/ui/Icon';
import { useBalances } from '@/shared/api/hooks/use-balances';
import { useTickers } from '@/shared/api/hooks/use-tickers';
import {
  formatDecimal,
  formatPrice,
  formatSignedPercent,
} from '@/shared/lib/format';
import { calculateTotalEquityUsdt } from '@/shared/lib/portfolio';
import { formatPairDisplay } from '@/shared/lib/symbol';
import { useMarketStore } from '@/shared/stores/market-store';

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
    <div
      style={{
        height: 60,
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-1)',
        padding: '0 16px',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span className="logo-mark">D</span>
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-.01em' }}>
          Demo Exchange
        </span>
        <span className="badge">PAPER</span>
      </div>

      <div style={{ width: 1, height: 32, background: 'var(--border)', margin: '0 16px' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 28, flex: 1, minWidth: 0 }}>
        <div
          ref={wrapRef}
          style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}
        >
          <button
            onClick={() => setPickerOpen((o) => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: pickerOpen ? 'var(--bg-3)' : 'transparent',
              border: '1px solid ' + (pickerOpen ? 'var(--border-strong)' : 'var(--border)'),
              padding: '6px 10px',
              borderRadius: 4,
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--text-0)',
            }}
          >
            <span>{active ? formatPairDisplay(active) : '...'}</span>
            <span style={{ color: 'var(--text-2)', display: 'inline-flex' }}>
              <Icon name="caret-down" size={12} />
            </span>
          </button>
          <button
            className="btn btn-ghost"
            style={{ height: 22, padding: '0 6px', fontSize: 11 }}
            data-tip="Add to favorites"
          >
            <Icon name="star" size={12} />
          </button>

          {pickerOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                width: 320,
                background: 'var(--bg-2)',
                border: '1px solid var(--border-strong)',
                borderRadius: 6,
                boxShadow: '0 12px 36px rgba(0,0,0,.5)',
                zIndex: 200,
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 420,
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>
                <div className="search-wrap">
                  <span style={{ color: 'var(--text-3)' }}>
                    <Icon name="search" size={13} />
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

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 100px 60px',
                  padding: '6px 12px',
                  fontSize: 10,
                  color: 'var(--text-2)',
                  textTransform: 'uppercase',
                  letterSpacing: '.04em',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--bg-1)',
                }}
              >
                <span>Pair</span>
                <span style={{ textAlign: 'right' }}>Last</span>
                <span style={{ textAlign: 'right' }}>24h%</span>
              </div>

              <div style={{ flex: 1, overflowY: 'auto' }}>
                {tickers === undefined && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 100px 60px',
                      padding: '8px 12px',
                      fontSize: 12,
                      color: 'var(--text-3)',
                    }}
                  >
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
                        className={'pair-row' + (isActive ? ' active' : '')}
                        onClick={() => {
                          router.push(`/trade/${t.symbol}`);
                          setPickerOpen(false);
                          setQuery('');
                        }}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 100px 60px',
                          padding: '8px 12px',
                          fontSize: 12,
                          cursor: 'default',
                          borderLeft: isActive
                            ? '2px solid var(--accent)'
                            : '2px solid transparent',
                        }}
                      >
                        <span style={{ color: isActive ? 'var(--text-0)' : 'var(--text-1)' }}>
                          <span style={{ fontWeight: 500 }}>{t.baseAsset}</span>
                          <span style={{ color: 'var(--text-3)' }}>/{t.quoteAsset}</span>
                        </span>
                        <span
                          className="mono"
                          style={{ textAlign: 'right', color: 'var(--text-0)' }}
                        >
                          {formatPrice(t.lastPrice)}
                        </span>
                        <span
                          className={'mono ' + (pos ? 'up' : 'down')}
                          style={{ textAlign: 'right', fontSize: 11 }}
                        >
                          {formatSignedPercent(t.priceChangePercent24h)}
                        </span>
                      </div>
                    );
                  })}
                {tickers !== undefined && filtered.length === 0 && (
                  <div
                    style={{
                      padding: 24,
                      textAlign: 'center',
                      color: 'var(--text-3)',
                      fontSize: 11,
                    }}
                  >
                    No pairs match &quot;{query}&quot;
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div
          className="mono"
          style={{
            fontSize: 'var(--fs-price)',
            fontWeight: 600,
            color: chgPos ? 'var(--up)' : 'var(--down)',
            letterSpacing: '-.01em',
          }}
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: 10,
              color: 'var(--text-2)',
              letterSpacing: '.04em',
              textTransform: 'uppercase',
            }}
          >
            Portfolio
          </div>
          <div className="mono" style={{ fontSize: 15, fontWeight: 600 }}>
            {formatDecimal(totalEquity, 2)}{' '}
            <span style={{ color: 'var(--text-2)', fontSize: 11, fontWeight: 400 }}>USDT</span>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={onReset} data-tip="Reset paper-trading balance">
          <Icon name="reset" size={13} /> Reset
        </button>
      </div>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div
        style={{
          fontSize: 10,
          color: 'var(--text-2)',
          letterSpacing: '.04em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        className={(mono ? 'mono ' : '') + (className || '')}
        style={{ fontSize: 12, fontWeight: 500 }}
      >
        {children}
      </div>
    </div>
  );
}

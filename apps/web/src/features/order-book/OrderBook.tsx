'use client';

import { formatPrice } from '@/shared/lib/format';
import type { MockPair, OrderBookLevel, OrderBookSnapshot } from '@/features/trade-terminal/types';

interface OrderBookProps {
  book: OrderBookSnapshot | null;
  pair: MockPair;
  onPriceClick?: (price: number) => void;
}

export function OrderBook({ book, pair, onPriceClick }: OrderBookProps) {
  if (!book) return null;
  const maxCum = Math.max(book.asks[0]?.cum || 0, book.bids[book.bids.length - 1]?.cum || 0) || 1;
  const last = pair.price;
  const lastUp = pair.chg >= 0;

  function Row({ row, side }: { row: OrderBookLevel; side: 'ask' | 'bid' }) {
    const pct = (row.cum / maxCum) * 100;
    return (
      <div
        className="ob-row"
        onClick={() => onPriceClick && onPriceClick(row.price)}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          padding: '2px 12px',
          fontSize: 11,
          fontFamily: 'JetBrains Mono, monospace',
          fontVariantNumeric: 'tabular-nums',
          height: 20,
          alignItems: 'center',
          position: 'relative',
          cursor: 'default',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: pct + '%',
            background: side === 'ask' ? 'var(--down-bg)' : 'var(--up-bg)',
            pointerEvents: 'none',
          }}
        />
        <span style={{ position: 'relative', color: side === 'ask' ? 'var(--down)' : 'var(--up)' }}>
          {formatPrice(row.price)}
        </span>
        <span style={{ position: 'relative', textAlign: 'right', color: 'var(--text-1)' }}>
          {row.size.toFixed(4)}
        </span>
        <span style={{ position: 'relative', textAlign: 'right', color: 'var(--text-2)' }}>
          {row.cum.toFixed(4)}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid var(--border)',
        borderRight: '1px solid var(--border)',
        background: 'var(--bg-1)',
        width: 240,
        flexShrink: 0,
        minHeight: 0,
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          fontSize: 11,
          fontWeight: 600,
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 36,
          flexShrink: 0,
        }}
      >
        <span>Order Book</span>
        <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: 10 }}>0.1</span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          padding: '4px 12px',
          fontSize: 10,
          color: 'var(--text-2)',
          borderBottom: '1px solid var(--border)',
          textTransform: 'uppercase',
          letterSpacing: '.04em',
        }}
      >
        <span>Price ({pair.quote})</span>
        <span style={{ textAlign: 'right' }}>Size ({pair.base})</span>
        <span style={{ textAlign: 'right' }}>Sum</span>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column-reverse',
          minHeight: 0,
        }}
      >
        {book.asks.map((r, i) => (
          <Row key={i} row={r} side="ask" />
        ))}
      </div>

      <div
        style={{
          padding: '8px 12px',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <span
          className={'mono ' + (lastUp ? 'up' : 'down')}
          style={{ fontSize: 16, fontWeight: 600 }}
        >
          {formatPrice(last)}
        </span>
        <span style={{ color: 'var(--text-2)', fontSize: 11 }} className="mono">
          ≈ ${formatPrice(last)}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {book.bids.map((r, i) => (
          <Row key={i} row={r} side="bid" />
        ))}
      </div>
    </div>
  );
}

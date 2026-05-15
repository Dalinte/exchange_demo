'use client';

import { useEffect, useRef, useState } from 'react';
import { useTickers } from '@/entities/ticker';
import { useMarketStore } from '@/entities/trading-pair';
import { formatPrice } from '@/shared/lib/format';
import { genOrderBook } from '@/widgets/order-book/lib/generate-mock-book';
import type { OrderBookLevel, OrderBookSnapshot } from '@/widgets/order-book/lib/types';

export function OrderBook() {
  const symbol = useMarketStore((s) => s.symbol);
  const { data: tickers } = useTickers();
  const ticker = tickers?.find((t) => t.symbol === symbol);
  const currentPrice = ticker?.lastPrice;
  const baseAsset = ticker?.baseAsset ?? '';
  const quoteAsset = ticker?.quoteAsset ?? 'USDT';

  const [book, setBook] = useState<OrderBookSnapshot | null>(null);
  const midRef = useRef<number | null>(null);

  useEffect(() => {
    midRef.current = null;
    setBook(null);
  }, [symbol]);

  useEffect(() => {
    if (!currentPrice) return;
    const mid = parseFloat(currentPrice);
    if (!Number.isFinite(mid) || mid <= 0) return;
    midRef.current = mid;
    setBook((previous) => previous ?? genOrderBook(mid));
  }, [currentPrice, symbol]);

  useEffect(() => {
    const id = setInterval(() => {
      const mid = midRef.current;
      if (mid == null) return;
      setBook(genOrderBook(mid));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  if (!book) return null;
  const maxCum = Math.max(book.asks[0]?.cum || 0, book.bids[book.bids.length - 1]?.cum || 0) || 1;

  function Row({ row, side }: { row: OrderBookLevel; side: 'ask' | 'bid' }) {
    const percent = (row.cum / maxCum) * 100;
    return (
      <div className="ob-row relative grid grid-cols-3 items-center px-3 h-5 text-[11px] mono">
        <div
          className={
            'absolute right-0 top-0 bottom-0 pointer-events-none ' +
            (side === 'ask' ? 'bg-down-bg' : 'bg-up-bg')
          }
          style={{ width: percent + '%' }}
        />
        <span className={'relative ' + (side === 'ask' ? 'text-down' : 'text-up')}>
          {formatPrice(row.price)}
        </span>
        <span className="relative text-right text-text-1">{row.size.toFixed(4)}</span>
        <span className="relative text-right text-text-2">{row.cum.toFixed(4)}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60 shrink-0 min-h-0 border-x border-border bg-bg-1">
      <div className="flex items-center justify-between h-9 px-3 py-2 border-b border-border text-[11px] font-semibold shrink-0">
        <span>Order Book</span>
        <span className="text-text-3 text-[10px] font-normal">0.1</span>
      </div>

      <div className="grid grid-cols-3 px-3 py-1 text-[10px] text-text-2 uppercase tracking-wider border-b border-border">
        <span>Price ({quoteAsset})</span>
        <span className="text-right">Size ({baseAsset})</span>
        <span className="text-right">Sum</span>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col-reverse min-h-0">
        {book.asks.map((r, i) => (
          <Row key={i} row={r} side="ask" />
        ))}
      </div>

      <div className="flex items-center justify-between px-3 py-2 border-y border-border bg-bg-2 shrink-0">
        <span className="mono text-base font-semibold text-text-0">
          {formatPrice(currentPrice ?? '')}
        </span>
        <span className="mono text-text-2 text-[11px]">≈ ${formatPrice(currentPrice ?? '')}</span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {book.bids.map((r, i) => (
          <Row key={i} row={r} side="bid" />
        ))}
      </div>
    </div>
  );
}

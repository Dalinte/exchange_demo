import { useState } from 'react';
import { Search } from 'lucide-react';
import type { TradingPairWithStats } from '@exchange/shared';
import { isPositiveChange } from '@/entities/ticker';
import { formatPrice, formatSignedPercent } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';

interface PairListProps {
  tickers: TradingPairWithStats[] | undefined;
  activeSymbol: string;
  onSelect: (symbol: string) => void;
}

export function PairList({ tickers, activeSymbol, onSelect }: PairListProps) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.toLowerCase();
  const filtered = (tickers ?? []).filter(
    (ticker) =>
      ticker.symbol.toLowerCase().includes(normalizedQuery) ||
      ticker.baseAsset.toLowerCase().includes(normalizedQuery),
  );

  return (
    <>
      <div className="p-2.5 border-b border-border">
        <div className="search-wrap">
          <Search size={13} className="text-text-3" />
          <input
            autoFocus
            className="field"
            placeholder="Search pairs"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
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
          filtered.map((ticker) => {
            const isActive = ticker.symbol === activeSymbol;
            const isPositive = isPositiveChange(ticker.priceChangePercent24h);
            return (
              <div
                key={ticker.symbol}
                className={cn(
                  'pair-row grid grid-cols-[1fr_100px_60px] px-3 py-2 text-[12px] cursor-default border-l-2',
                  isActive ? 'active border-accent-line' : 'border-transparent',
                )}
                onClick={() => onSelect(ticker.symbol)}
              >
                <span className={isActive ? 'text-text-0' : 'text-text-1'}>
                  <span className="font-medium">{ticker.baseAsset}</span>
                  <span className="text-text-3">/{ticker.quoteAsset}</span>
                </span>
                <span className="mono text-right text-text-0">
                  {formatPrice(ticker.lastPrice)}
                </span>
                <span
                  className={cn(
                    'mono text-right text-[11px]',
                    isPositive ? 'text-up' : 'text-down',
                  )}
                >
                  {formatSignedPercent(ticker.priceChangePercent24h)}
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
    </>
  );
}

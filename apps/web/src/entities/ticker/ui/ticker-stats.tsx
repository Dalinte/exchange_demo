'use client';

import { useMarketStore } from '@/entities/trading-pair';
import { formatDecimal, formatPrice, formatSignedPercent } from '@/shared/lib/format';
import { Stat } from '@/shared/ui/stat';
import { cn } from '@/shared/lib/utils';
import { useTickerBySymbol } from '../api/use-tickers';
import { isPositiveChange } from '../lib/is-positive-change';

export function TickerStats() {
  const symbol = useMarketStore((store) => store.symbol);
  const { data: active } = useTickerBySymbol(symbol);
  const isPriceUp = active ? isPositiveChange(active.priceChangePercent24h) : true;

  return (
    <div className="flex items-center gap-7">
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
  );
}

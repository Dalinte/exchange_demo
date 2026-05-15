'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { useTickers } from '@/entities/ticker';
import { useMarketStore, formatPairDisplay } from '@/entities/trading-pair';
import { Popover, PopoverTrigger, PopoverContent } from '@/shared/ui/popover';
import { cn } from '@/shared/lib/utils';
import { PairList } from './pair-list';

export function PairPicker() {
  const symbol = useMarketStore((store) => store.symbol);
  const router = useRouter();
  const { data: tickers } = useTickers();
  const active = tickers?.find((ticker) => ticker.symbol === symbol);

  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (selectedSymbol: string) => {
    router.push(`/trade/${selectedSymbol}`);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 rounded-sm border px-2.5 py-1.5 text-base font-semibold text-text-0',
            isOpen ? 'bg-bg-3 border-border-strong' : 'bg-transparent border-border',
          )}
        >
          <span>{active ? formatPairDisplay(active) : '...'}</span>
          <ChevronDown size={12} className="text-text-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="flex max-h-[420px] w-80 flex-col overflow-hidden border-border-strong p-0 shadow-[0_12px_36px_rgba(0,0,0,.5)]"
      >
        <PairList tickers={tickers} activeSymbol={symbol} onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  );
}

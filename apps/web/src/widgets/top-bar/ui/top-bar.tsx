'use client';

import { useBalances, calculateTotalEquityUsdt } from '@/entities/balance';
import { TickerStats } from '@/entities/ticker';
import { formatDecimal } from '@/shared/lib/format';
import { Stat } from '@/shared/ui/stat';
import { PairPicker } from '@/features/select-trading-pair';
import { ResetAccountButton } from '@/features/reset-account';
import { Brand } from './brand';

export function TopBar() {
  const { data: balances } = useBalances();
  const totalEquity = calculateTotalEquityUsdt(balances);

  return (
    <div className="flex items-center h-[60px] shrink-0 px-4 border-b border-border bg-bg-1">
      <Brand />

      <div className="w-px h-8 bg-border mx-4" />

      <div className="flex items-center gap-7 flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <PairPicker />
        </div>

        <TickerStats />
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Stat label="Portfolio" align="right" className="mono text-[15px] font-semibold">
          {formatDecimal(totalEquity, 2)}{' '}
          <span className="text-text-2 text-[11px] font-normal">USDT</span>
        </Stat>
        <ResetAccountButton />
      </div>
    </div>
  );
}

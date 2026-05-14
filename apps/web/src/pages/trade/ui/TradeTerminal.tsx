'use client';

import { useState } from 'react';
import { Toaster } from 'sonner';
import { BottomTabs } from '@/widgets/bottom-tabs';
import { CandleChart } from '@/widgets/candle-chart';
import { OrderBook } from '@/widgets/order-book';
import { OrderForm } from '@/widgets/order-form';
import { StatusFooter } from '@/widgets/status-footer';
import { TopBar } from '@/widgets/top-bar';
import { ResetModal } from '@/features/reset-account';
import { SymbolSync, useMarketStore } from '@/entities/trading-pair';
import type { Timeframe } from '@/widgets/candle-chart';

interface TradeTerminalProps {
  initialSymbol: string;
}

export function TradeTerminal({ initialSymbol }: TradeTerminalProps) {
  useState(() => {
    if (useMarketStore.getState().symbol !== initialSymbol) {
      useMarketStore.setState({ symbol: initialSymbol });
    }
    return true;
  });

  const [timeframe, setTimeframe] = useState<Timeframe>('15m');
  const [presetPrice, setPresetPrice] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <SymbolSync />
      <TopBar onReset={() => setResetOpen(true)} />

      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        <div
          style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}
        >
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                minHeight: 0,
              }}
            >
              <CandleChart timeframe={timeframe} onTimeframe={setTimeframe} />
            </div>
            <OrderBook onPriceClick={setPresetPrice} />
          </div>
          <BottomTabs />
        </div>

        <OrderForm presetPrice={presetPrice} onPresetConsumed={() => setPresetPrice(null)} />
      </div>

      {resetOpen && <ResetModal onClose={() => setResetOpen(false)} />}
      <Toaster theme="light" position="top-right" />

      <StatusFooter />
    </div>
  );
}

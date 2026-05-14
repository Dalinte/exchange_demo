'use client';

import { useState } from 'react';
import { Toaster } from 'sonner';
import { BottomTabs } from '@/features/bottom-tabs/BottomTabs';
import { CandleChart } from '@/features/candle-chart/CandleChart';
import type { Timeframe } from '@/features/candle-chart/timeframes';
import { OrderBook } from '@/features/order-book/OrderBook';
import { OrderForm } from '@/features/order-form/OrderForm';
import { ResetModal } from '@/features/reset-modal/ResetModal';
import { StatusFooter } from '@/features/status-footer/StatusFooter';
import { TopBar } from '@/features/top-bar/TopBar';
import { SymbolSync } from '@/shared/stores/SymbolSync';
import { useMarketStore } from '@/shared/stores/market-store';

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

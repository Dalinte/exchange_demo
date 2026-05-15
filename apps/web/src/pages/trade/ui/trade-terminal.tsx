'use client';

import { useState } from 'react';
import { Toaster } from 'sonner';
import { BottomTabs } from '@/widgets/bottom-tabs';
import { CandleChart } from '@/widgets/candle-chart';
import { OrderBook } from '@/widgets/order-book';
import { OrderForm } from '@/widgets/order-form';
import { StatusFooter } from '@/widgets/status-footer';
import { TopBar } from '@/widgets/top-bar';
import { SymbolSync, useMarketStore } from '@/entities/trading-pair';

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

  const [presetPrice, setPresetPrice] = useState<string | null>(null);

  return (
    <div className="h-full flex flex-col">
      <SymbolSync />
      <TopBar />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-1 flex min-h-0">
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
              <CandleChart />
            </div>
            <OrderBook onPriceClick={setPresetPrice} />
          </div>
          <BottomTabs />
        </div>

        <OrderForm presetPrice={presetPrice} onPresetConsumed={() => setPresetPrice(null)} />
      </div>

      <Toaster theme="light" position="top-right" />

      <StatusFooter />
    </div>
  );
}

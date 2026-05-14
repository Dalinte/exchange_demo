'use client';

import { useCallback, useEffect, useState } from 'react';
import { BottomTabs } from '@/features/bottom-tabs/BottomTabs';
import { CandleChart } from '@/features/candle-chart/CandleChart';
import type { Timeframe } from '@/features/candle-chart/timeframes';
import { OrderBook } from '@/features/order-book/OrderBook';
import { OrderForm } from '@/features/order-form/OrderForm';
import { ResetModal } from '@/features/reset-modal/ResetModal';
import { StatusFooter } from '@/features/status-footer/StatusFooter';
import { Toasts } from '@/features/toasts/Toasts';
import { TopBar } from '@/features/top-bar/TopBar';
import { SymbolSync } from '@/shared/stores/SymbolSync';
import { useMarketStore } from '@/shared/stores/market-store';
import { genCandles, genOrderBook } from './mocks';
import type { Candle, MockPair, OrderBookSnapshot, Toast } from './types';

interface TradeTerminalProps {
  initialSymbol: string;
}

const MOCK_SEED_PRICE = 67000;
const mockPair: MockPair = {
  sym: 'BTC/USDT',
  base: 'BTC',
  quote: 'USDT',
  price: MOCK_SEED_PRICE,
  chg: 0,
  vol: '0',
  high: 67500,
  low: 66500,
};
const mockBalances: Record<string, number> = { USDT: 0, BTC: 0 };

export function TradeTerminal({ initialSymbol }: TradeTerminalProps) {
  useState(() => {
    if (useMarketStore.getState().symbol !== initialSymbol) {
      useMarketStore.setState({ symbol: initialSymbol });
    }
    return true;
  });

  const [timeframe, setTimeframe] = useState<Timeframe>('15m');
  const [presetPrice, setPresetPrice] = useState<number | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [candles] = useState<Candle[]>(() => genCandles(MOCK_SEED_PRICE, 60));
  const [book, setBook] = useState<OrderBookSnapshot | null>(() => genOrderBook(MOCK_SEED_PRICE));
  useEffect(() => {
    const id = setInterval(() => setBook(genOrderBook(MOCK_SEED_PRICE)), 3000);
    return () => clearInterval(id);
  }, []);

  const pushToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((x) => [...x, { ...t, id }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 3500);
  }, []);

  const submitOrder = useCallback(() => {
    pushToast({ title: 'Order placement coming soon', kind: 'error' });
  }, [pushToast]);

  const cancelOrder = useCallback(() => {
    pushToast({ title: 'Order cancel coming soon', kind: 'error' });
  }, [pushToast]);

  const doReset = useCallback(() => {
    setResetOpen(false);
    pushToast({ title: 'Reset coming soon', kind: 'error' });
  }, [pushToast]);

  const onPresetConsumed = useCallback(() => setPresetPrice(null), []);

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
              <CandleChart
                candles={candles}
                pair={mockPair}
                timeframe={timeframe}
                onTimeframe={setTimeframe}
              />
            </div>
            <OrderBook book={book} pair={mockPair} onPriceClick={(p) => setPresetPrice(p)} />
          </div>
          <BottomTabs onCancel={cancelOrder} />
        </div>

        <OrderForm
          pair={mockPair}
          balances={mockBalances}
          onSubmit={submitOrder}
          presetPrice={presetPrice}
          onPresetConsumed={onPresetConsumed}
        />
      </div>

      {resetOpen && <ResetModal onConfirm={doReset} onClose={() => setResetOpen(false)} />}
      <Toasts toasts={toasts} />

      <StatusFooter />
    </div>
  );
}

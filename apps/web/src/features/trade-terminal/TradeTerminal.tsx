'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BottomTabs } from '@/features/bottom-tabs/BottomTabs';
import { CandleChart } from '@/features/candle-chart/CandleChart';
import type { Timeframe } from '@/features/candle-chart/timeframes';
import { OrderBook } from '@/features/order-book/OrderBook';
import { OrderForm } from '@/features/order-form/OrderForm';
import { ResetModal } from '@/features/reset-modal/ResetModal';
import { StatusFooter } from '@/features/status-footer/StatusFooter';
import { Toasts } from '@/features/toasts/Toasts';
import { TopBar } from '@/features/top-bar/TopBar';
import { fmt, fmtPrice } from './format';
import { PAIRS, STARTING_BALANCES, genCandles, genOrderBook, seedTradeHistory } from './mocks';
import type {
  Balances,
  Candle,
  HistoryOrder,
  OpenOrder,
  OrderBookSnapshot,
  Pair,
  SubmittedOrder,
  Toast,
  TradeRecord,
} from './types';

interface TradeTerminalProps {
  initialSymbol: string;
}

function resolveInitialSym(initialSymbol: string): string {
  const found = PAIRS.find((p) => p.sym.replace('/', '') === initialSymbol);
  return found ? found.sym : 'BTC/USDT';
}

export function TradeTerminal({ initialSymbol }: TradeTerminalProps) {
  const [pairs, setPairs] = useState<Pair[]>(PAIRS);
  const [activeSym, setActiveSym] = useState<string>(() => resolveInitialSym(initialSymbol));
  const activePair = pairs.find((p) => p.sym === activeSym) || pairs[0];

  const [timeframe, setTimeframe] = useState<Timeframe>('15m');
  const [book, setBook] = useState<OrderBookSnapshot | null>(null);
  const [balances, setBalances] = useState<Balances>(STARTING_BALANCES);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const [orderHistory, setOrderHistory] = useState<HistoryOrder[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeRecord[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [presetPrice, setPresetPrice] = useState<number | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    setTradeHistory(seedTradeHistory());
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setPairs((prev) =>
        prev.map((p) => {
          const drift = (Math.random() - 0.5) * p.price * 0.0008;
          const newPrice = Math.max(0.0001, p.price + drift);
          return { ...p, price: newPrice };
        }),
      );
    }, 2200);
    return () => clearInterval(id);
  }, []);

  const [candles, setCandles] = useState<Candle[]>([]);
  useEffect(() => {
    setCandles(genCandles(activePair.price, 60));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSym, timeframe]);

  const candlesLive = useMemo(() => {
    if (!candles.length) return candles;
    const out = candles.slice();
    const last = { ...out[out.length - 1] };
    last.close = activePair.price;
    if (last.close > last.high) last.high = last.close;
    if (last.close < last.low) last.low = last.close;
    out[out.length - 1] = last;
    return out;
  }, [candles, activePair.price]);

  useEffect(() => {
    setBook(genOrderBook(activePair.price));
    const id = setInterval(() => setBook(genOrderBook(activePair.price)), 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSym]);

  const pushToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((x) => [...x, { ...t, id }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 3500);
  }, []);

  function submitOrder({ side, type, price, amount, total, pair, ts }: SubmittedOrder) {
    const id = 'O' + Math.random().toString(36).slice(2, 9);
    if (type === 'market') {
      const fee = total * 0.001;
      const next: Balances = { ...balances };
      if (side === 'buy') {
        next.USDT -= total;
        next[pair.base] = (next[pair.base] || 0) + amount;
      } else {
        next[pair.base] -= amount;
        next.USDT = (next.USDT || 0) + total - fee;
      }
      setBalances(next);
      setTradeHistory((prev) => [
        {
          id,
          ts,
          pair: pair.sym,
          side,
          price,
          amount,
          total,
          fee,
          feeCcy: side === 'buy' ? pair.base : 'USDT',
        },
        ...prev,
      ]);
      setOrderHistory((prev) => [
        { id, ts, pair: pair.sym, side, type, price, amount, total, status: 'Filled' },
        ...prev,
      ]);
      pushToast({
        title: `${side === 'buy' ? 'Bought' : 'Sold'} ${amount.toFixed(6)} ${pair.base}`,
        sub: `at market ~ ${fmtPrice(price)} ${pair.quote}  ·  Total ${fmt(total, 2)} USDT`,
        kind: side === 'sell' ? 'sell' : '',
      });
    } else {
      setOpenOrders((prev) => [{ id, ts, pair, side, type, price, amount, total }, ...prev]);
      pushToast({
        title: `Limit ${side} order placed`,
        sub: `${amount.toFixed(6)} ${pair.base} @ ${fmtPrice(price)} ${pair.quote}`,
        kind: side === 'sell' ? 'sell' : '',
      });
    }
  }

  function cancelOrder(id: string) {
    const o = openOrders.find((x) => x.id === id);
    if (!o) return;
    setOpenOrders((prev) => prev.filter((x) => x.id !== id));
    setOrderHistory((prev) => [
      {
        id: o.id,
        ts: Date.now(),
        pair: o.pair.sym,
        side: o.side,
        type: o.type,
        price: o.price,
        amount: o.amount,
        total: o.total,
        status: 'Cancelled',
      },
      ...prev,
    ]);
    pushToast({
      title: 'Order cancelled',
      sub: `${o.pair.sym} · ${o.side} · ${o.amount.toFixed(6)}`,
      kind: 'error',
    });
  }

  function doReset() {
    setBalances(STARTING_BALANCES);
    setOpenOrders([]);
    setOrderHistory([]);
    setTradeHistory([]);
    setResetOpen(false);
    pushToast({ title: 'Account reset', sub: 'Balances restored to starting amount' });
  }

  const totalUSDT = useMemo(() => {
    let total = 0;
    for (const [k, v] of Object.entries(balances)) {
      if (k === 'USDT') {
        total += v;
        continue;
      }
      const p = pairs.find((x) => x.base === k);
      if (p) total += v * p.price;
    }
    return total;
  }, [balances, pairs]);

  const onPresetConsumed = useCallback(() => setPresetPrice(null), []);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TopBar
        pair={activePair}
        pairs={pairs}
        onSelectPair={(p) => setActiveSym(p.sym)}
        totalUSDT={totalUSDT}
        onReset={() => setResetOpen(true)}
      />

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
                candles={candlesLive}
                pair={activePair}
                timeframe={timeframe}
                onTimeframe={setTimeframe}
              />
            </div>
            <OrderBook book={book} pair={activePair} onPriceClick={(p) => setPresetPrice(p)} />
          </div>
          <BottomTabs
            openOrders={openOrders}
            orderHistory={orderHistory}
            tradeHistory={tradeHistory}
            balances={balances}
            pair={activePair}
            onCancel={cancelOrder}
          />
        </div>

        <OrderForm
          pair={activePair}
          balances={balances}
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

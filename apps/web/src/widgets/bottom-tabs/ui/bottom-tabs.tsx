'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { BalanceMap, OrderView, TradeView, TradingPairWithStats } from '@exchange/shared';
import { useBalances } from '@/entities/balance';
import { useOpenOrders, useOrderHistory } from '@/entities/order';
import { useTickers } from '@/entities/ticker';
import { useTradeHistory } from '@/entities/trade';
import { useCancelOrder } from '@/features/cancel-order';
import { parseApiError } from '@/shared/api/api-error';
import { Button } from '@/shared/ui/button';
import { formatDecimal, formatPrice, formatTime } from '@/shared/lib/format';

type TabId = 'open' | 'history' | 'trades' | 'balances';

function displaySymbol(sym: string, tickers: TradingPairWithStats[] | undefined): string {
  const t = tickers?.find((x) => x.symbol === sym);
  return t ? `${t.baseAsset}/${t.quoteAsset}` : sym;
}

export function BottomTabs() {
  const [tab, setTab] = useState<TabId>('open');
  const { data: openOrders = [] } = useOpenOrders();
  const { data: orderHistory = [] } = useOrderHistory();
  const { data: trades = [] } = useTradeHistory();
  const { data: balances } = useBalances();
  const { data: tickers } = useTickers();

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'open', label: 'Open Orders', count: openOrders.length },
    { id: 'history', label: 'Order History', count: orderHistory.length },
    { id: 'trades', label: 'Trade History', count: trades.length },
    { id: 'balances', label: 'Balances' },
  ];

  return (
    <div className="flex flex-col h-60 shrink-0 border-t border-border bg-bg-1">
      <div className="flex shrink-0 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={'tab ' + (tab === t.id ? 'active' : '')}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.count != null && (
              <span className="ml-1.5 rounded-lg bg-bg-3 px-1.5 py-px text-[10px] text-text-1">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {tab === 'open' && <OpenOrders orders={openOrders} tickers={tickers} />}
        {tab === 'history' && <OrderHistory orders={orderHistory} tickers={tickers} />}
        {tab === 'trades' && <TradeHistory trades={trades} tickers={tickers} />}
        {tab === 'balances' && <Balances balances={balances} />}
      </div>
    </div>
  );
}

function OpenOrders({
  orders,
  tickers,
}: {
  orders: OrderView[];
  tickers: TradingPairWithStats[] | undefined;
}) {
  const cancelOrder = useCancelOrder();

  if (!orders.length) return <div className="empty">No open orders</div>;
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Time</th>
          <th>Pair</th>
          <th>Type</th>
          <th>Side</th>
          <th className="right">Price</th>
          <th className="right">Amount</th>
          <th className="right">Filled</th>
          <th className="right">Total</th>
          <th className="right">Action</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => {
          const isCancelling = cancelOrder.isPending && cancelOrder.variables === order.id;
          return (
            <tr key={order.id}>
              <td className="mono text-text-2">{formatTime(order.createdAt)}</td>
              <td>{displaySymbol(order.symbol, tickers)}</td>
              <td className="capitalize">{order.type.toLowerCase()}</td>
              <td className={(order.side === 'BUY' ? 'up' : 'down') + ' capitalize font-medium'}>
                {order.side.toLowerCase()}
              </td>
              <td className="mono right">{order.price ? formatPrice(order.price) : '—'}</td>
              <td className="mono right">{formatDecimal(order.quantity, 6)}</td>
              <td className="mono right text-text-2">{formatDecimal(order.filledQuantity, 6)}</td>
              <td className="mono right">{formatDecimal(order.total, 2)}</td>
              <td className="right">
                <Button
                  variant="outline"
                  size="xs"
                  disabled={isCancelling}
                  onClick={() =>
                    cancelOrder.mutate(order.id, {
                      onSuccess: () => toast.success('Order cancelled'),
                      onError: (error) => toast.error(parseApiError(error)),
                    })
                  }
                >
                  Cancel
                </Button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function OrderHistory({
  orders,
  tickers,
}: {
  orders: OrderView[];
  tickers: TradingPairWithStats[] | undefined;
}) {
  if (!orders.length) return <div className="empty">No completed orders yet</div>;
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Time</th>
          <th>Pair</th>
          <th>Type</th>
          <th>Side</th>
          <th className="right">Price</th>
          <th className="right">Amount</th>
          <th className="right">Total</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => {
          const isFilled = order.status === 'FILLED';
          return (
            <tr key={order.id}>
              <td className="mono text-text-2">{formatTime(order.createdAt)}</td>
              <td>{displaySymbol(order.symbol, tickers)}</td>
              <td className="capitalize">{order.type.toLowerCase()}</td>
              <td className={(order.side === 'BUY' ? 'up' : 'down') + ' capitalize font-medium'}>
                {order.side.toLowerCase()}
              </td>
              <td className="mono right">{order.price ? formatPrice(order.price) : '—'}</td>
              <td className="mono right">{formatDecimal(order.quantity, 6)}</td>
              <td className="mono right">{formatDecimal(order.total, 2)}</td>
              <td>
                <span
                  className={
                    'text-[11px] px-1.5 py-0.5 rounded-[3px] ' +
                    (isFilled ? 'bg-up-bg text-up' : 'bg-down-bg text-down')
                  }
                >
                  {isFilled ? 'Filled' : 'Cancelled'}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function TradeHistory({
  trades,
  tickers,
}: {
  trades: TradeView[];
  tickers: TradingPairWithStats[] | undefined;
}) {
  if (!trades.length) return <div className="empty">No trades yet</div>;
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Time</th>
          <th>Pair</th>
          <th>Side</th>
          <th className="right">Price</th>
          <th className="right">Amount</th>
          <th className="right">Total</th>
          <th className="right">Fee</th>
        </tr>
      </thead>
      <tbody>
        {trades.map((t) => (
          <tr key={t.id}>
            <td className="mono text-text-2">{formatTime(t.createdAt)}</td>
            <td>{displaySymbol(t.symbol, tickers)}</td>
            <td className={(t.side === 'BUY' ? 'up' : 'down') + ' capitalize font-medium'}>
              {t.side.toLowerCase()}
            </td>
            <td className="mono right">{formatPrice(t.price)}</td>
            <td className="mono right">{formatDecimal(t.quantity, 6)}</td>
            <td className="mono right">{formatDecimal(t.quoteAmount, 2)}</td>
            <td className="mono right text-text-2">
              {formatDecimal(t.fee, 4)} {t.feeAsset}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Balances({ balances }: { balances: BalanceMap | undefined }) {
  if (!balances) {
    return (
      <table className="tbl">
        <thead>
          <tr>
            <th>Asset</th>
            <th className="right">Total</th>
            <th className="right">Available</th>
            <th className="right">In Order</th>
            <th className="right">Value (USDT)</th>
          </tr>
        </thead>
        <tbody />
      </table>
    );
  }

  const rows = Object.entries(balances).filter(
    ([k, b]) => Number(b.total) > 0 || k === 'USDT' || k === 'BTC',
  );

  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Asset</th>
          <th className="right">Total</th>
          <th className="right">Available</th>
          <th className="right">In Order</th>
          <th className="right">Value (USDT)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([k, b]) => (
          <tr key={k}>
            <td className="font-medium">{k}</td>
            <td className="mono right">{formatDecimal(b.total, 6)}</td>
            <td className="mono right">{formatDecimal(b.free, 6)}</td>
            <td className="mono right text-text-2">{formatDecimal(b.locked, 6)}</td>
            <td className="mono right">{formatDecimal(b.valueUsdt, 2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

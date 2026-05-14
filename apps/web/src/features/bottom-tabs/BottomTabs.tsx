'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { BalanceMap, OrderView, TradeView, TradingPairWithStats } from '@exchange/shared';
import { useCancelOrder } from '@/shared/api/hooks/mutations/use-cancel-order';
import { useBalances } from '@/shared/api/hooks/use-balances';
import { useOpenOrders, useOrderHistory } from '@/shared/api/hooks/use-orders';
import { useTickers } from '@/shared/api/hooks/use-tickers';
import { useTradeHistory } from '@/shared/api/hooks/use-trades';
import { parseApiError } from '@/shared/lib/api-error';
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
    <div
      style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-1)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: 240,
      }}
    >
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            className={'tab ' + (tab === t.id ? 'active' : '')}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.count != null && (
              <span
                style={{
                  marginLeft: 6,
                  padding: '1px 6px',
                  background: 'var(--bg-3)',
                  borderRadius: 8,
                  fontSize: 10,
                  color: 'var(--text-1)',
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
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
              <td className="mono" style={{ color: 'var(--text-2)' }}>
                {formatTime(order.createdAt)}
              </td>
              <td>{displaySymbol(order.symbol, tickers)}</td>
              <td style={{ textTransform: 'capitalize' }}>{order.type.toLowerCase()}</td>
              <td
                className={order.side === 'BUY' ? 'up' : 'down'}
                style={{ textTransform: 'capitalize', fontWeight: 500 }}
              >
                {order.side.toLowerCase()}
              </td>
              <td className="mono right">{order.price ? formatPrice(order.price) : '—'}</td>
              <td className="mono right">{formatDecimal(order.quantity, 6)}</td>
              <td className="mono right" style={{ color: 'var(--text-2)' }}>
                {formatDecimal(order.filledQuantity, 6)}
              </td>
              <td className="mono right">{formatDecimal(order.total, 2)}</td>
              <td className="right">
                <button
                  className="btn btn-ghost"
                  style={{ height: 24, padding: '0 8px', fontSize: 11 }}
                  disabled={isCancelling}
                  onClick={() =>
                    cancelOrder.mutate(order.id, {
                      onSuccess: () => toast.success('Order cancelled'),
                      onError: (error) => toast.error(parseApiError(error)),
                    })
                  }
                >
                  Cancel
                </button>
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
              <td className="mono" style={{ color: 'var(--text-2)' }}>
                {formatTime(order.createdAt)}
              </td>
              <td>{displaySymbol(order.symbol, tickers)}</td>
              <td style={{ textTransform: 'capitalize' }}>{order.type.toLowerCase()}</td>
              <td
                className={order.side === 'BUY' ? 'up' : 'down'}
                style={{ textTransform: 'capitalize', fontWeight: 500 }}
              >
                {order.side.toLowerCase()}
              </td>
              <td className="mono right">{order.price ? formatPrice(order.price) : '—'}</td>
              <td className="mono right">{formatDecimal(order.quantity, 6)}</td>
              <td className="mono right">{formatDecimal(order.total, 2)}</td>
              <td>
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 6px',
                    borderRadius: 3,
                    background: isFilled ? 'var(--up-bg)' : 'var(--down-bg)',
                    color: isFilled ? 'var(--up)' : 'var(--down)',
                  }}
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
            <td className="mono" style={{ color: 'var(--text-2)' }}>
              {formatTime(t.createdAt)}
            </td>
            <td>{displaySymbol(t.symbol, tickers)}</td>
            <td
              className={t.side === 'BUY' ? 'up' : 'down'}
              style={{ textTransform: 'capitalize', fontWeight: 500 }}
            >
              {t.side.toLowerCase()}
            </td>
            <td className="mono right">{formatPrice(t.price)}</td>
            <td className="mono right">{formatDecimal(t.quantity, 6)}</td>
            <td className="mono right">{formatDecimal(t.quoteAmount, 2)}</td>
            <td className="mono right" style={{ color: 'var(--text-2)' }}>
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
            <td style={{ fontWeight: 500 }}>{k}</td>
            <td className="mono right">{formatDecimal(b.total, 6)}</td>
            <td className="mono right">{formatDecimal(b.free, 6)}</td>
            <td className="mono right" style={{ color: 'var(--text-2)' }}>
              {formatDecimal(b.locked, 6)}
            </td>
            <td className="mono right">{formatDecimal(b.valueUsdt, 2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

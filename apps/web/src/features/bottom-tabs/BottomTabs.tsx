'use client';

import { useState } from 'react';
import { fmt, fmtPrice, timeOf } from '@/features/trade-terminal/format';
import { PAIRS } from '@/features/trade-terminal/mocks';
import type {
  Balances as BalancesType,
  HistoryOrder,
  OpenOrder,
  Pair,
  TradeRecord,
} from '@/features/trade-terminal/types';

interface BottomTabsProps {
  openOrders: OpenOrder[];
  orderHistory: HistoryOrder[];
  tradeHistory: TradeRecord[];
  balances: BalancesType;
  pair: Pair;
  onCancel: (id: string) => void;
}

type TabId = 'open' | 'history' | 'trades' | 'balances';

export function BottomTabs({
  openOrders,
  orderHistory,
  tradeHistory,
  balances,
  onCancel,
}: BottomTabsProps) {
  const [tab, setTab] = useState<TabId>('open');

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'open', label: 'Open Orders', count: openOrders.length },
    { id: 'history', label: 'Order History', count: orderHistory.length },
    { id: 'trades', label: 'Trade History', count: tradeHistory.length },
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
        {tab === 'open' && <OpenOrders orders={openOrders} onCancel={onCancel} />}
        {tab === 'history' && <OrderHistory orders={orderHistory} />}
        {tab === 'trades' && <TradeHistory trades={tradeHistory} />}
        {tab === 'balances' && <Balances balances={balances} />}
      </div>
    </div>
  );
}

function OpenOrders({ orders, onCancel }: { orders: OpenOrder[]; onCancel: (id: string) => void }) {
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
        {orders.map((o) => (
          <tr key={o.id}>
            <td className="mono" style={{ color: 'var(--text-2)' }}>
              {timeOf(new Date(o.ts))}
            </td>
            <td>{o.pair.sym}</td>
            <td style={{ textTransform: 'capitalize' }}>{o.type}</td>
            <td
              className={o.side === 'buy' ? 'up' : 'down'}
              style={{ textTransform: 'capitalize', fontWeight: 500 }}
            >
              {o.side}
            </td>
            <td className="mono right">{fmtPrice(o.price)}</td>
            <td className="mono right">{o.amount.toFixed(6)}</td>
            <td className="mono right" style={{ color: 'var(--text-2)' }}>
              0.000000
            </td>
            <td className="mono right">{fmt(o.total, 2)}</td>
            <td className="right">
              <button
                className="btn btn-ghost"
                style={{ height: 24, padding: '0 8px', fontSize: 11 }}
                onClick={() => onCancel(o.id)}
              >
                Cancel
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OrderHistory({ orders }: { orders: HistoryOrder[] }) {
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
        {orders.map((o) => (
          <tr key={o.id}>
            <td className="mono" style={{ color: 'var(--text-2)' }}>
              {timeOf(new Date(o.ts))}
            </td>
            <td>{o.pair}</td>
            <td style={{ textTransform: 'capitalize' }}>{o.type}</td>
            <td
              className={o.side === 'buy' ? 'up' : 'down'}
              style={{ textTransform: 'capitalize', fontWeight: 500 }}
            >
              {o.side}
            </td>
            <td className="mono right">{fmtPrice(o.price)}</td>
            <td className="mono right">{o.amount.toFixed(6)}</td>
            <td className="mono right">{fmt(o.total, 2)}</td>
            <td>
              <span
                style={{
                  fontSize: 11,
                  padding: '2px 6px',
                  borderRadius: 3,
                  background: o.status === 'Filled' ? 'var(--up-bg)' : 'var(--down-bg)',
                  color: o.status === 'Filled' ? 'var(--up)' : 'var(--down)',
                }}
              >
                {o.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TradeHistory({ trades }: { trades: TradeRecord[] }) {
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
              {timeOf(new Date(t.ts))}
            </td>
            <td>{t.pair}</td>
            <td
              className={t.side === 'buy' ? 'up' : 'down'}
              style={{ textTransform: 'capitalize', fontWeight: 500 }}
            >
              {t.side}
            </td>
            <td className="mono right">{fmtPrice(t.price)}</td>
            <td className="mono right">{t.amount.toFixed(6)}</td>
            <td className="mono right">{fmt(t.total, 2)}</td>
            <td className="mono right" style={{ color: 'var(--text-2)' }}>
              {fmt(t.fee, 4)} {t.feeCcy}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Balances({ balances }: { balances: BalancesType }) {
  const rows = Object.entries(balances).filter(([k, v]) => v > 0 || k === 'USDT' || k === 'BTC');
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
        {rows.map(([k, v]) => {
          const matchedPair = PAIRS.find((p) => p.base === k);
          const px = matchedPair ? matchedPair.price : k === 'USDT' ? 1 : 0;
          return (
            <tr key={k}>
              <td style={{ fontWeight: 500 }}>{k}</td>
              <td className="mono right">{fmt(v, 6)}</td>
              <td className="mono right">{fmt(v, 6)}</td>
              <td className="mono right" style={{ color: 'var(--text-2)' }}>
                0.000000
              </td>
              <td className="mono right">{fmt(v * px, 2)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

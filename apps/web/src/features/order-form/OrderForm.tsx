'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { formatDecimal, formatPrice } from '@/shared/lib/format';
import type { MockPair, SubmittedOrder } from '@/features/trade-terminal/types';

type OrderSide = 'buy' | 'sell';
type OrderType = 'limit' | 'market';
type Balances = Record<string, number>;

interface OrderFormProps {
  pair: MockPair;
  balances: Balances;
  onSubmit: (order: SubmittedOrder) => void;
  presetPrice: number | null;
  onPresetConsumed: () => void;
}

export function OrderForm({
  pair,
  balances,
  onSubmit,
  presetPrice,
  onPresetConsumed,
}: OrderFormProps) {
  const [side, setSide] = useState<OrderSide>('buy');
  const [type, setType] = useState<OrderType>('limit');
  const [price, setPrice] = useState<number | string>(pair.price);
  const [amount, setAmount] = useState('');
  const [pct, setPct] = useState(0);

  useEffect(() => {
    setPrice(pair.price);
    setAmount('');
    setPct(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair.sym]);

  useEffect(() => {
    if (presetPrice != null) {
      setType('limit');
      setPrice(presetPrice);
      onPresetConsumed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetPrice]);

  const effectivePrice = type === 'market' ? pair.price : Number(price) || 0;
  const amountNum = Number(amount) || 0;
  const total = effectivePrice * amountNum;

  const availUSDT = balances.USDT || 0;
  const availBase = balances[pair.base] || 0;
  const availLabel =
    side === 'buy' ? `${formatDecimal(availUSDT, 4)} USDT` : `${formatDecimal(availBase, 6)} ${pair.base}`;

  function applyPct(p: number) {
    setPct(p);
    if (side === 'buy') {
      const usdtToSpend = availUSDT * (p / 100);
      const newAmount = effectivePrice > 0 ? usdtToSpend / effectivePrice : 0;
      setAmount(newAmount.toFixed(6));
    } else {
      const newAmount = availBase * (p / 100);
      setAmount(newAmount.toFixed(6));
    }
  }

  function handleAmount(v: string) {
    setAmount(v);
    setPct(0);
  }

  const tooLittle = amountNum <= 0;
  const tooMuch = side === 'buy' ? total > availUSDT + 1e-9 : amountNum > availBase + 1e-9;
  const disabled = tooLittle || tooMuch;

  function submit() {
    if (disabled) return;
    onSubmit({
      side,
      type,
      price: effectivePrice,
      amount: amountNum,
      total,
      pair,
      ts: Date.now(),
    });
    setAmount('');
    setPct(0);
  }

  const stops = [0, 25, 50, 75, 100];

  return (
    <div
      style={{
        width: 320,
        flexShrink: 0,
        borderLeft: '1px solid var(--border)',
        background: 'var(--bg-1)',
        display: 'flex',
        flexDirection: 'column',
        padding: 12,
        gap: 12,
        overflowY: 'auto',
      }}
    >
      <div className="side-toggle">
        <button
          className={'buy' + (side === 'buy' ? ' active' : '')}
          onClick={() => setSide('buy')}
        >
          Buy
        </button>
        <button
          className={'sell' + (side === 'sell' ? ' active' : '')}
          onClick={() => setSide('sell')}
        >
          Sell
        </button>
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)' }}>
        {(['limit', 'market'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            style={{
              background: 'transparent',
              border: 0,
              color: type === t ? 'var(--text-0)' : 'var(--text-2)',
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: type === t ? 600 : 400,
              borderBottom: type === t ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 11,
        }}
      >
        <span style={{ color: 'var(--text-2)' }}>Available</span>
        <span className="mono" style={{ color: 'var(--text-1)' }}>
          {availLabel}
        </span>
      </div>

      {type === 'limit' && (
        <FormRow label="Price">
          <FieldNum value={String(price)} onChange={(v) => setPrice(v)} unit={pair.quote} />
        </FormRow>
      )}

      {type === 'market' && (
        <div
          style={{
            padding: '8px 10px',
            background: 'var(--bg-2)',
            border: '1px dashed var(--border)',
            borderRadius: 4,
            fontSize: 11,
            color: 'var(--text-2)',
            textAlign: 'center',
          }}
        >
          Will execute at market price{' '}
          <span className="mono" style={{ color: 'var(--text-0)' }}>
            ~ {formatPrice(pair.price)} {pair.quote}
          </span>
        </div>
      )}

      <FormRow label="Amount">
        <FieldNum value={amount} onChange={handleAmount} unit={pair.base} placeholder="0.00" />
      </FormRow>

      <div className="pct-track">
        <div className="pct-fill" style={{ width: pct + '%' }} />
        {stops.map((s) => (
          <div
            key={s}
            className="pct-stop"
            style={{ left: s + '%' }}
            data-tip={s + '%'}
            onClick={() => applyPct(s)}
          />
        ))}
        {pct > 0 && <div className="pct-dot" style={{ left: pct + '%' }} />}
        {stops.map((s) => (
          <div key={s} className="pct-label" style={{ left: s + '%' }} onClick={() => applyPct(s)}>
            {s}%
          </div>
        ))}
      </div>

      <FormRow label="Total">
        <FieldNum
          value={total > 0 ? total.toFixed(2) : ''}
          onChange={(v) => {
            const t = Number(v) || 0;
            if (effectivePrice > 0) setAmount((t / effectivePrice).toFixed(6));
            setPct(0);
          }}
          unit={pair.quote}
          placeholder="0.00"
        />
      </FormRow>

      {tooMuch && (
        <div style={{ fontSize: 11, color: 'var(--down)' }}>
          Insufficient {side === 'buy' ? 'USDT' : pair.base} balance
        </div>
      )}

      <button
        className={'action-btn ' + side}
        onClick={submit}
        disabled={disabled}
        style={{ opacity: disabled ? 0.45 : 1 }}
      >
        {side === 'buy' ? 'Buy' : 'Sell'} {pair.base}
      </button>

      <div
        style={{
          marginTop: 4,
          padding: 10,
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          fontSize: 11,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-2)' }}>USDT</span>
          <span className="mono">{formatDecimal(availUSDT, 2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-2)' }}>{pair.base}</span>
          <span className="mono">{formatDecimal(availBase, 6)}</span>
        </div>
      </div>
    </div>
  );
}

interface FormRowProps {
  label: string;
  children: ReactNode;
}

function FormRow({ label, children }: FormRowProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div
        style={{
          fontSize: 10,
          color: 'var(--text-2)',
          textTransform: 'uppercase',
          letterSpacing: '.04em',
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

interface FieldNumProps {
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  placeholder?: string;
}

function FieldNum({ value, onChange, unit, placeholder }: FieldNumProps) {
  return (
    <div style={{ position: 'relative' }}>
      <input
        className="field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || ''}
        style={{ paddingRight: unit ? 56 : 10 }}
      />
      {unit && (
        <span
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 11,
            color: 'var(--text-2)',
            fontFamily: 'JetBrains Mono, monospace',
            pointerEvents: 'none',
          }}
        >
          {unit}
        </span>
      )}
    </div>
  );
}

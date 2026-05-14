'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { useBalances } from '@/shared/api/hooks/use-balances';
import { useTickers } from '@/shared/api/hooks/use-tickers';
import { useTradingPairs } from '@/shared/api/hooks/use-trading-pairs';
import { Decimal, toFixedDown } from '@/shared/lib/decimal';
import { formatDecimal, formatPrice } from '@/shared/lib/format';
import { useMarketStore } from '@/shared/stores/market-store';

type OrderSide = 'BUY' | 'SELL';
type OrderType = 'LIMIT' | 'MARKET';

interface OrderFormProps {
  presetPrice: string | null;
  onPresetConsumed: () => void;
}

export function OrderForm({ presetPrice, onPresetConsumed }: OrderFormProps) {
  const symbol = useMarketStore((s) => s.symbol);
  const { data: tickers } = useTickers();
  const { data: balances } = useBalances();
  const { data: pairs } = useTradingPairs();

  const ticker = tickers?.find((t) => t.symbol === symbol);
  const pair = pairs?.find((p) => p.symbol === symbol);
  const baseAsset = ticker?.baseAsset ?? '';
  const quoteAsset = ticker?.quoteAsset ?? 'USDT';
  const currentPrice = ticker?.lastPrice ?? '0';
  const availQuote = balances?.[quoteAsset]?.free ?? '0';
  const availBase = baseAsset ? (balances?.[baseAsset]?.free ?? '0') : '0';
  const qtyPrecision = pair?.quantityPrecision ?? 6;
  const pricePrecision = pair?.pricePrecision ?? 2;

  const [side, setSide] = useState<OrderSide>('BUY');
  const [type, setType] = useState<OrderType>('LIMIT');
  const [price, setPrice] = useState<string>(currentPrice);
  const [amount, setAmount] = useState('');
  const [pct, setPct] = useState(0);

  useEffect(() => {
    setPrice(currentPrice);
    setAmount('');
    setPct(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  useEffect(() => {
    if (presetPrice != null) {
      setType('LIMIT');
      setPrice(presetPrice);
      onPresetConsumed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetPrice]);

  const effectivePrice = type === 'MARKET' ? currentPrice : price || '0';
  const priceD = safeDecimal(effectivePrice);
  const amountD = safeDecimal(amount);
  const totalD = amountD.mul(priceD);

  const tooMuch =
    side === 'BUY' ? totalD.gt(safeDecimal(availQuote)) : amountD.gt(safeDecimal(availBase));
  const disabled = amountD.lte(0) || tooMuch || !ticker;

  function applyPct(percent: number) {
    setPct(percent);
    const p = new Decimal(percent).div(100);
    let newAmount: Decimal;
    if (side === 'BUY') {
      const divisor = priceD.gt(0) ? priceD : new Decimal(1);
      newAmount = safeDecimal(availQuote).mul(p).div(divisor);
    } else {
      newAmount = safeDecimal(availBase).mul(p);
    }
    setAmount(toFixedDown(newAmount, qtyPrecision));
  }

  function handleAmount(v: string) {
    setAmount(v);
    setPct(0);
  }

  function handleTotal(v: string) {
    setPct(0);
    if (!priceD.gt(0)) {
      setAmount('');
      return;
    }
    const t = safeDecimal(v);
    setAmount(toFixedDown(t.div(priceD), qtyPrecision));
  }

  function submit() {
    if (disabled) return;
    console.warn('Order submit coming in 5F');
    setAmount('');
    setPct(0);
  }

  const availLabel =
    side === 'BUY'
      ? `${formatDecimal(availQuote, 4)} ${quoteAsset}`
      : `${formatDecimal(availBase, 6)} ${baseAsset || ''}`.trim();

  const totalDisplay = totalD.gt(0) ? totalD.toFixed(pricePrecision) : '';
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
          className={'buy' + (side === 'BUY' ? ' active' : '')}
          onClick={() => setSide('BUY')}
        >
          Buy
        </button>
        <button
          className={'sell' + (side === 'SELL' ? ' active' : '')}
          onClick={() => setSide('SELL')}
        >
          Sell
        </button>
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)' }}>
        {(['LIMIT', 'MARKET'] as const).map((t) => (
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
            {t.toLowerCase()}
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

      {type === 'LIMIT' && (
        <FormRow label="Price">
          <FieldNum value={price} onChange={setPrice} unit={quoteAsset} />
        </FormRow>
      )}

      {type === 'MARKET' && (
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
            ~ {formatPrice(currentPrice)} {quoteAsset}
          </span>
        </div>
      )}

      <FormRow label="Amount">
        <FieldNum value={amount} onChange={handleAmount} unit={baseAsset} placeholder="0.00" />
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
          value={totalDisplay}
          onChange={handleTotal}
          unit={quoteAsset}
          placeholder="0.00"
        />
      </FormRow>

      {tooMuch && (
        <div style={{ fontSize: 11, color: 'var(--down)' }}>
          Insufficient {side === 'BUY' ? quoteAsset : baseAsset} balance
        </div>
      )}

      <button
        className={'action-btn ' + side.toLowerCase()}
        onClick={submit}
        disabled={disabled}
        style={{ opacity: disabled ? 0.45 : 1 }}
      >
        {side === 'BUY' ? 'Buy' : 'Sell'} {baseAsset}
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
          <span style={{ color: 'var(--text-2)' }}>{quoteAsset}</span>
          <span className="mono">{formatDecimal(availQuote, 2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-2)' }}>{baseAsset || '—'}</span>
          <span className="mono">{formatDecimal(availBase, 6)}</span>
        </div>
      </div>
    </div>
  );
}

function safeDecimal(value: string): Decimal {
  if (!value) return new Decimal(0);
  try {
    return new Decimal(value);
  } catch {
    return new Decimal(0);
  }
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

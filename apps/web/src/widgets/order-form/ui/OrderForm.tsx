'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactNode, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useBalances } from '@/entities/balance';
import { useTickers } from '@/entities/ticker';
import { useTradingPairs, useMarketStore } from '@/entities/trading-pair';
import { useCreateOrder } from '@/features/create-order';
import { parseApiError } from '@/shared/api/api-error';
import { Decimal, toFixedDown } from '@/shared/lib/decimal';
import { formatDecimal, formatPrice } from '@/shared/lib/format';

interface OrderFormProps {
  presetPrice: string | null;
  onPresetConsumed: () => void;
}

const formSchema = z.object({
  side: z.enum(['BUY', 'SELL']),
  type: z.enum(['MARKET', 'LIMIT']),
  quantity: z.string().min(1, 'Enter amount'),
  price: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

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
  const availableQuote = balances?.[quoteAsset]?.free ?? '0';
  const availableBase = baseAsset ? (balances?.[baseAsset]?.free ?? '0') : '0';
  const quantityPrecision = pair?.quantityPrecision ?? 6;
  const pricePrecision = pair?.pricePrecision ?? 2;

  const { watch, setValue, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { side: 'BUY', type: 'LIMIT', quantity: '', price: currentPrice },
    mode: 'onChange',
  });

  const side = watch('side');
  const type = watch('type');
  const quantity = watch('quantity');
  const price = watch('price') ?? '';

  const [percent, setPercent] = useState(0);

  const createOrder = useCreateOrder();

  useEffect(() => {
    reset({ side, type, quantity: '', price: currentPrice });
    setPercent(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  useEffect(() => {
    if (presetPrice != null) {
      setValue('type', 'LIMIT');
      setValue('price', presetPrice);
      onPresetConsumed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetPrice]);

  const effectivePrice = type === 'MARKET' ? currentPrice : price || '0';
  const priceDecimal = safeDecimal(effectivePrice);
  const amountDecimal = safeDecimal(quantity);
  const totalDecimal = amountDecimal.mul(priceDecimal);

  const tooMuch =
    side === 'BUY'
      ? totalDecimal.gt(safeDecimal(availableQuote))
      : amountDecimal.gt(safeDecimal(availableBase));
  const disabled = createOrder.isPending || amountDecimal.lte(0) || tooMuch || !ticker;

  function applyPercent(nextPercent: number) {
    setPercent(nextPercent);
    const fraction = new Decimal(nextPercent).div(100);
    let newAmount: Decimal;
    if (side === 'BUY') {
      const divisor = priceDecimal.gt(0) ? priceDecimal : new Decimal(1);
      newAmount = safeDecimal(availableQuote).mul(fraction).div(divisor);
    } else {
      newAmount = safeDecimal(availableBase).mul(fraction);
    }
    setValue('quantity', toFixedDown(newAmount, quantityPrecision), { shouldValidate: true });
  }

  function handleAmount(value: string) {
    setValue('quantity', value, { shouldValidate: true });
    setPercent(0);
  }

  function handleTotal(value: string) {
    setPercent(0);
    if (!priceDecimal.gt(0)) {
      setValue('quantity', '', { shouldValidate: true });
      return;
    }
    const totalInput = safeDecimal(value);
    setValue('quantity', toFixedDown(totalInput.div(priceDecimal), quantityPrecision), {
      shouldValidate: true,
    });
  }

  const onSubmit = handleSubmit((values) => {
    if (values.type === 'LIMIT') {
      toast.error('Limit orders are not implemented yet');
      return;
    }
    createOrder.mutate(
      { type: 'MARKET', symbol, side: values.side, quantity: values.quantity },
      {
        onSuccess: (order) => {
          const verb = values.side === 'BUY' ? 'Bought' : 'Sold';
          const fillPrice = order.averageFillPrice ?? ticker?.lastPrice ?? '0';
          const title = `${verb} ${formatDecimal(order.filledQuantity, quantityPrecision)} ${baseAsset}`;
          const description = `at ~${formatPrice(fillPrice)} ${quoteAsset}`;
          if (values.side === 'BUY') {
            toast.success(title, { description });
          } else {
            toast(title, { description, className: 'toast-sell' });
          }
          reset({ side: values.side, type: 'MARKET', quantity: '', price: currentPrice });
          setPercent(0);
        },
        onError: (error) => {
          toast.error(parseApiError(error));
        },
      },
    );
  });

  const availableLabel =
    side === 'BUY'
      ? `${formatDecimal(availableQuote, 4)} ${quoteAsset}`
      : `${formatDecimal(availableBase, 6)} ${baseAsset || ''}`.trim();

  const totalDisplay = totalDecimal.gt(0) ? totalDecimal.toFixed(pricePrecision) : '';
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
          onClick={() => setValue('side', 'BUY', { shouldValidate: true })}
        >
          Buy
        </button>
        <button
          className={'sell' + (side === 'SELL' ? ' active' : '')}
          onClick={() => setValue('side', 'SELL', { shouldValidate: true })}
        >
          Sell
        </button>
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)' }}>
        {(['LIMIT', 'MARKET'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setValue('type', t)}
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
          {availableLabel}
        </span>
      </div>

      {type === 'LIMIT' && (
        <FormRow label="Price">
          <FieldNum
            value={price}
            onChange={(v) => setValue('price', v)}
            unit={quoteAsset}
          />
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
        <FieldNum value={quantity} onChange={handleAmount} unit={baseAsset} placeholder="0.00" />
      </FormRow>

      <div className="pct-track">
        <div className="pct-fill" style={{ width: percent + '%' }} />
        {stops.map((stop) => (
          <div
            key={stop}
            className="pct-stop"
            style={{ left: stop + '%' }}
            data-tip={stop + '%'}
            onClick={() => applyPercent(stop)}
          />
        ))}
        {percent > 0 && <div className="pct-dot" style={{ left: percent + '%' }} />}
        {stops.map((stop) => (
          <div
            key={stop}
            className="pct-label"
            style={{ left: stop + '%' }}
            onClick={() => applyPercent(stop)}
          >
            {stop}%
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
        onClick={onSubmit}
        disabled={disabled}
        style={{ opacity: disabled ? 0.45 : 1 }}
      >
        {createOrder.isPending ? 'Placing…' : `${side === 'BUY' ? 'Buy' : 'Sell'} ${baseAsset}`}
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
          <span className="mono">{formatDecimal(availableQuote, 2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-2)' }}>{baseAsset || '—'}</span>
          <span className="mono">{formatDecimal(availableBase, 6)}</span>
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

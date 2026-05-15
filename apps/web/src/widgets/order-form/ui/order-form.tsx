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
import { Slider } from '@/shared/ui/slider';

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
    defaultValues: { side: 'BUY', type: 'MARKET', quantity: '', price: currentPrice },
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
  const limitUnsupported = type === 'LIMIT';
  const disabled =
    createOrder.isPending || amountDecimal.lte(0) || tooMuch || !ticker || limitUnsupported;

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
    <div className="flex flex-col w-80 shrink-0 gap-3 p-3 overflow-y-auto border-l border-border bg-bg-1">
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

      <div className="flex border-b border-border">
        {(['MARKET', 'LIMIT'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setValue('type', t)}
            className={
              'px-3.5 py-2 text-[12px] capitalize bg-transparent border-0 -mb-px border-b-2 ' +
              (type === t
                ? 'text-text-0 font-semibold border-accent-line'
                : 'text-text-2 font-normal border-transparent')
            }
          >
            {t.toLowerCase()}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <span className="text-text-2">Available</span>
        <button
          type="button"
          onClick={() => applyPercent(100)}
          className="mono text-text-1 hover:text-text-0 hover:underline underline-offset-2 disabled:cursor-not-allowed disabled:hover:no-underline disabled:hover:text-text-1"
          disabled={!ticker}
          title="Use full available balance"
        >
          {availableLabel}
        </button>
      </div>

      {type === 'LIMIT' && (
        <FormRow label="Price">
          <FieldNum value={price} onChange={(v) => setValue('price', v)} unit={quoteAsset} />
        </FormRow>
      )}

      {type === 'MARKET' && (
        <div className="rounded-sm border border-dashed border-border bg-bg-2 px-2.5 py-2 text-[11px] text-text-2 text-center">
          Will execute at market price{' '}
          <span className="mono text-text-0">
            ~ {formatPrice(currentPrice)} {quoteAsset}
          </span>
        </div>
      )}

      <FormRow label="Amount">
        <FieldNum value={quantity} onChange={handleAmount} unit={baseAsset} placeholder="0.00" />
      </FormRow>

      <div className="px-1 pt-2 pb-1">
        <Slider
          value={[percent]}
          min={0}
          max={100}
          step={1}
          onValueChange={([next]) => applyPercent(next ?? 0)}
        />
        <div className="relative mt-3 h-3">
          {stops.map((stop) => (
            <button
              key={stop}
              type="button"
              onClick={() => applyPercent(stop)}
              className="mono absolute -translate-x-1/2 text-[10px] text-text-2 hover:text-text-0"
              style={{ left: stop + '%' }}
            >
              {stop}%
            </button>
          ))}
        </div>
      </div>

      <FormRow label="Total">
        <FieldNum
          value={totalDisplay}
          onChange={handleTotal}
          unit={quoteAsset}
          placeholder="0.00"
        />
      </FormRow>

      {tooMuch && !limitUnsupported && (
        <div className="text-[11px] text-down">
          Insufficient {side === 'BUY' ? quoteAsset : baseAsset} balance
        </div>
      )}

      {limitUnsupported && (
        <div className="rounded-sm border border-dashed border-border bg-bg-2 px-2.5 py-2 text-[11px] text-text-2 text-center">
          Limit orders are not supported yet — please use <span className="text-text-0">Market</span>
          .
        </div>
      )}

      <button
        className={'action-btn ' + side.toLowerCase() + (disabled ? ' opacity-[0.45]' : '')}
        onClick={onSubmit}
        disabled={disabled}
      >
        {createOrder.isPending ? 'Placing…' : `${side === 'BUY' ? 'Buy' : 'Sell'} ${baseAsset}`}
      </button>

      <div className="mt-1 flex flex-col gap-1 rounded-sm border border-border bg-bg-2 p-2.5 text-[11px]">
        <div className="flex justify-between">
          <span className="text-text-2">{quoteAsset}</span>
          <span className="mono">{formatDecimal(availableQuote, 2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-2">{baseAsset || '—'}</span>
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
    <div className="flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-wider text-text-2">{label}</div>
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
    <div className="relative">
      <input
        className={'field ' + (unit ? 'pr-14' : 'pr-2.5')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || ''}
      />
      {unit && (
        <span className="mono pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-text-2">
          {unit}
        </span>
      )}
    </div>
  );
}

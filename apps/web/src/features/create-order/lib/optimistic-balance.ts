import type {
  BalanceItem,
  BalanceMap,
  CreateMarketOrderDto,
  TradingPairWithStats,
} from '@exchange/shared';
import { Decimal } from '@/shared/lib/decimal';

export function applyOptimisticMarketOrder(
  balances: BalanceMap,
  dto: CreateMarketOrderDto,
  ticker: TradingPairWithStats,
): BalanceMap {
  const next: BalanceMap = {};
  for (const [asset, balance] of Object.entries(balances)) {
    next[asset] = { ...balance };
  }

  const price = new Decimal(ticker.lastPrice);
  const quantity = new Decimal(dto.quantity);
  const baseAsset = ticker.baseAsset;
  const quoteAsset = ticker.quoteAsset;
  const notional = quantity.mul(price);

  const ensure = (asset: string): BalanceItem => {
    if (!next[asset]) {
      next[asset] = {
        asset,
        free: '0',
        locked: '0',
        total: '0',
        valueUsdt: '0',
      };
    }
    return next[asset];
  };

  if (dto.side === 'BUY') {
    const quoteBalance = ensure(quoteAsset);
    quoteBalance.free = new Decimal(quoteBalance.free).minus(notional).toFixed();
    quoteBalance.total = new Decimal(quoteBalance.total).minus(notional).toFixed();
    quoteBalance.valueUsdt = quoteBalance.total;

    const baseBalance = ensure(baseAsset);
    baseBalance.free = new Decimal(baseBalance.free).plus(quantity).toFixed();
    baseBalance.total = new Decimal(baseBalance.total).plus(quantity).toFixed();
    baseBalance.valueUsdt = new Decimal(baseBalance.total).mul(price).toFixed();
  } else {
    const baseBalance = ensure(baseAsset);
    baseBalance.free = new Decimal(baseBalance.free).minus(quantity).toFixed();
    baseBalance.total = new Decimal(baseBalance.total).minus(quantity).toFixed();
    baseBalance.valueUsdt = new Decimal(baseBalance.total).mul(price).toFixed();

    const quoteBalance = ensure(quoteAsset);
    quoteBalance.free = new Decimal(quoteBalance.free).plus(notional).toFixed();
    quoteBalance.total = new Decimal(quoteBalance.total).plus(notional).toFixed();
    quoteBalance.valueUsdt = quoteBalance.total;
  }

  return next;
}

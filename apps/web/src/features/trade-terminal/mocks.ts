import type { Balances, Candle, OrderBookSnapshot, Pair, TradeRecord } from './types';

export const PAIRS: Pair[] = [
  {
    sym: 'BTC/USDT',
    base: 'BTC',
    quote: 'USDT',
    price: 67421.53,
    chg: 2.34,
    vol: '24,891.2',
    high: 68120.0,
    low: 65820.0,
  },
  {
    sym: 'ETH/USDT',
    base: 'ETH',
    quote: 'USDT',
    price: 3284.16,
    chg: 1.82,
    vol: '142,331.5',
    high: 3340.2,
    low: 3201.1,
  },
  {
    sym: 'SOL/USDT',
    base: 'SOL',
    quote: 'USDT',
    price: 178.42,
    chg: -0.92,
    vol: '581,202.1',
    high: 184.1,
    low: 175.2,
  },
  {
    sym: 'BNB/USDT',
    base: 'BNB',
    quote: 'USDT',
    price: 612.8,
    chg: 0.45,
    vol: '52,118.7',
    high: 619.0,
    low: 605.4,
  },
  {
    sym: 'XRP/USDT',
    base: 'XRP',
    quote: 'USDT',
    price: 0.5421,
    chg: -1.12,
    vol: '12,481,920.0',
    high: 0.552,
    low: 0.538,
  },
];

export function genCandles(seedPrice: number, n = 60): Candle[] {
  let p = seedPrice * 0.97;
  const out: Candle[] = [];
  for (let i = 0; i < n; i++) {
    const drift = (Math.sin(i / 6) + Math.cos(i / 11)) * seedPrice * 0.0015;
    const vol = (Math.random() - 0.5) * seedPrice * 0.006;
    const open = p;
    const close = p + drift + vol;
    const high = Math.max(open, close) + Math.random() * seedPrice * 0.003;
    const low = Math.min(open, close) - Math.random() * seedPrice * 0.003;
    out.push({ open, close, high, low, volume: Math.random() * 100 + 20 });
    p = close;
  }
  const lastDelta = seedPrice - out[n - 1].close;
  for (let i = n - 6; i < n; i++) {
    out[i].open += (lastDelta * (i - (n - 6))) / 6;
    out[i].close += (lastDelta * (i - (n - 5))) / 6;
    out[i].high += (lastDelta * (i - (n - 6))) / 6;
    out[i].low += (lastDelta * (i - (n - 6))) / 6;
  }
  out[n - 1].close = seedPrice;
  return out;
}

export function genOrderBook(mid: number, levels = 14): OrderBookSnapshot {
  const tick = mid > 1000 ? 0.1 : mid > 100 ? 0.01 : 0.0001;
  const asks: OrderBookSnapshot['asks'] = [];
  const bids: OrderBookSnapshot['bids'] = [];
  let askCum = 0;
  let bidCum = 0;
  for (let i = 0; i < levels; i++) {
    const askPrice = mid + tick * (i + 1) + Math.random() * tick * 0.4;
    const askSize = +(Math.random() * 1.5 + 0.05).toFixed(4);
    askCum += askSize;
    asks.push({ price: askPrice, size: askSize, cum: askCum });

    const bidPrice = mid - tick * (i + 1) - Math.random() * tick * 0.4;
    const bidSize = +(Math.random() * 1.5 + 0.05).toFixed(4);
    bidCum += bidSize;
    bids.push({ price: bidPrice, size: bidSize, cum: bidCum });
  }
  return { asks: asks.reverse(), bids };
}

export const STARTING_USDT = 50000;
export const STARTING_BALANCES: Balances = {
  USDT: STARTING_USDT,
  BTC: 0.4321,
  ETH: 2.15,
  SOL: 18.5,
  BNB: 0.0,
  XRP: 0.0,
};

export function seedTradeHistory(): TradeRecord[] {
  const now = Date.now();
  return [
    {
      id: 'h1',
      ts: now - 1000 * 60 * 42,
      pair: 'BTC/USDT',
      side: 'buy',
      price: 66912.1,
      amount: 0.025,
      total: 1672.8,
      fee: 0.0167,
      feeCcy: 'BTC',
    },
    {
      id: 'h2',
      ts: now - 1000 * 60 * 120,
      pair: 'ETH/USDT',
      side: 'buy',
      price: 3201.5,
      amount: 0.5,
      total: 1600.75,
      fee: 0.0005,
      feeCcy: 'ETH',
    },
    {
      id: 'h3',
      ts: now - 1000 * 60 * 240,
      pair: 'SOL/USDT',
      side: 'sell',
      price: 182.4,
      amount: 5.0,
      total: 912.0,
      fee: 0.504,
      feeCcy: 'USDT',
    },
  ];
}

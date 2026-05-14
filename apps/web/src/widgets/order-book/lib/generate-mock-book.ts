import type { Candle, OrderBookSnapshot } from './types';

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

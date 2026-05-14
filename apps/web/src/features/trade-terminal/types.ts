export interface Candle {
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

export interface OrderBookLevel {
  price: number;
  size: number;
  cum: number;
}

export interface OrderBookSnapshot {
  asks: OrderBookLevel[];
  bids: OrderBookLevel[];
}

export type ToastKind = '' | 'sell' | 'error';

export interface Toast {
  id: string;
  title: string;
  sub?: string;
  kind?: ToastKind;
}

export interface MockPair {
  sym: string;
  base: string;
  quote: string;
  price: number;
  chg: number;
  vol: string;
  high: number;
  low: number;
}

export interface SubmittedOrder {
  side: 'buy' | 'sell';
  type: 'limit' | 'market';
  price: number;
  amount: number;
  total: number;
  pair: MockPair;
  ts: number;
}

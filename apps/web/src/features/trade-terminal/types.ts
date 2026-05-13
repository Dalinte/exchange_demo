export interface Pair {
  sym: string;
  base: string;
  quote: string;
  price: number;
  chg: number;
  vol: string;
  high: number;
  low: number;
}

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

export type Balances = Record<string, number>;

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'limit' | 'market';

export interface OpenOrder {
  id: string;
  ts: number;
  pair: Pair;
  side: OrderSide;
  type: OrderType;
  price: number;
  amount: number;
  total: number;
}

export type OrderStatus = 'Filled' | 'Cancelled';

export interface HistoryOrder {
  id: string;
  ts: number;
  pair: string;
  side: OrderSide;
  type: OrderType;
  price: number;
  amount: number;
  total: number;
  status: OrderStatus;
}

export interface TradeRecord {
  id: string;
  ts: number;
  pair: string;
  side: OrderSide;
  price: number;
  amount: number;
  total: number;
  fee: number;
  feeCcy: string;
}

export type ToastKind = '' | 'sell' | 'error';

export interface Toast {
  id: string;
  title: string;
  sub?: string;
  kind?: ToastKind;
}

export interface SubmittedOrder {
  side: OrderSide;
  type: OrderType;
  price: number;
  amount: number;
  total: number;
  pair: Pair;
  ts: number;
}

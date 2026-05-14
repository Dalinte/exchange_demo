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

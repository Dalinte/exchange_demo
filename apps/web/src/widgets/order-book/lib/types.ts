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

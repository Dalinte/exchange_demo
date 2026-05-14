import {
  KlineIntervalSchema,
  type KlineInterval,
  type KlineUpdate,
  type TickerUpdate,
} from '@exchange/shared';

export type ParsedChannel =
  | { kind: 'kline'; symbol: string; interval: KlineInterval }
  | { kind: 'ticker'; symbol: string };

function isKlineInterval(value: string): value is KlineInterval {
  return KlineIntervalSchema.safeParse(value).success;
}

export function parseChannel(channel: string): ParsedChannel | null {
  const parts = channel.split(':');
  if (parts.some((p) => p.length === 0)) return null;

  if (parts[0] === 'kline') {
    if (parts.length !== 3) return null;
    const symbol = parts[1].toUpperCase();
    const interval = parts[2];
    if (!isKlineInterval(interval)) return null;
    return { kind: 'kline', symbol, interval };
  }

  if (parts[0] === 'ticker') {
    if (parts.length !== 2) return null;
    return { kind: 'ticker', symbol: parts[1].toUpperCase() };
  }

  return null;
}

export function channelToBinanceStream(channel: ParsedChannel): string {
  const symbol = channel.symbol.toLowerCase();
  if (channel.kind === 'kline') {
    return `${symbol}@kline_${channel.interval}`;
  }
  return `${symbol}@ticker`;
}

interface BinanceKlineEnvelope {
  k: {
    o: string;
    h: string;
    l: string;
    c: string;
    v: string;
    t: number;
    T: number;
  };
}

interface BinanceTickerPayload {
  c: string;
  P: string;
  v: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isBinanceKlineEnvelope(value: unknown): value is BinanceKlineEnvelope {
  if (!isRecord(value)) return false;
  const k = value.k;
  if (!isRecord(k)) return false;
  return (
    typeof k.o === 'string' &&
    typeof k.h === 'string' &&
    typeof k.l === 'string' &&
    typeof k.c === 'string' &&
    typeof k.v === 'string' &&
    typeof k.t === 'number' &&
    typeof k.T === 'number'
  );
}

function isBinanceTickerPayload(value: unknown): value is BinanceTickerPayload {
  if (!isRecord(value)) return false;
  return (
    typeof value.c === 'string' &&
    typeof value.P === 'string' &&
    typeof value.v === 'string'
  );
}

export function binanceKlineToUpdate(
  symbol: string,
  interval: string,
  payload: unknown,
): KlineUpdate | null {
  if (!isBinanceKlineEnvelope(payload)) return null;
  const k = payload.k;
  return {
    type: 'kline',
    symbol,
    interval,
    data: {
      open: k.o,
      high: k.h,
      low: k.l,
      close: k.c,
      volume: k.v,
      openTime: k.t,
      closeTime: k.T,
    },
  };
}

export function binanceTickerToUpdate(
  symbol: string,
  payload: unknown,
): TickerUpdate | null {
  if (!isBinanceTickerPayload(payload)) return null;
  return {
    type: 'ticker',
    symbol,
    lastPrice: payload.c,
    priceChangePercent24h: payload.P,
    volume24h: payload.v,
  };
}

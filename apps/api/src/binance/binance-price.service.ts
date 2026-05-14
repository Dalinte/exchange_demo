import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import Decimal from 'decimal.js';

const CACHE_TTL_MS = 1000;
const TICKER24H_CACHE_TTL_MS = 5_000;
const REQUEST_TIMEOUT_MS = 5000;
const TICKER_URL = 'https://api.binance.com/api/v3/ticker/price';
const TICKER_24H_URL = 'https://api.binance.com/api/v3/ticker/24hr';

interface CacheEntry {
  price: Decimal;
  fetchedAt: number;
}

interface TickerResponse {
  symbol?: unknown;
  price?: unknown;
}

export interface BinanceTicker24h {
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
}

interface Ticker24hResponse extends BinanceTicker24h {
  symbol?: unknown;
}

interface Ticker24hCacheEntry {
  data: BinanceTicker24h;
  fetchedAt: number;
}

interface AllTickers24hCacheEntry {
  data: Map<string, BinanceTicker24h>;
  fetchedAt: number;
}

@Injectable()
export class BinancePriceService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ticker24hCache = new Map<string, Ticker24hCacheEntry>();
  private allTickers24hCache: AllTickers24hCacheEntry | null = null;

  async getCurrentPrice(symbol: string): Promise<Decimal> {
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.price;
    }

    const price = await this.fetchPrice(symbol);
    this.cache.set(symbol, { price, fetchedAt: Date.now() });
    return price;
  }

  async getTicker24h(symbol: string): Promise<BinanceTicker24h> {
    const cached = this.ticker24hCache.get(symbol);
    if (cached && Date.now() - cached.fetchedAt < TICKER24H_CACHE_TTL_MS) {
      return cached.data;
    }

    const data = await this.fetchTicker24h(symbol);
    this.ticker24hCache.set(symbol, { data, fetchedAt: Date.now() });
    return data;
  }

  async getAllTickers24h(): Promise<Map<string, BinanceTicker24h>> {
    if (
      this.allTickers24hCache &&
      Date.now() - this.allTickers24hCache.fetchedAt < TICKER24H_CACHE_TTL_MS
    ) {
      return this.allTickers24hCache.data;
    }

    const data = await this.fetchAllTickers24h();
    this.allTickers24hCache = { data, fetchedAt: Date.now() };
    return data;
  }

  private async fetchPrice(symbol: string): Promise<Decimal> {
    const body = await this.requestJson<TickerResponse>(
      `${TICKER_URL}?symbol=${encodeURIComponent(symbol)}`,
    );

    if (
      typeof body.symbol !== 'string' ||
      body.symbol !== symbol ||
      typeof body.price !== 'string'
    ) {
      throw new ServiceUnavailableException('Price feed unavailable');
    }

    let price: Decimal;
    try {
      price = new Decimal(body.price);
    } catch {
      throw new ServiceUnavailableException('Price feed unavailable');
    }

    if (!price.isFinite() || price.lte(0)) {
      throw new ServiceUnavailableException('Price feed unavailable');
    }

    return price;
  }

  private async fetchTicker24h(symbol: string): Promise<BinanceTicker24h> {
    const body = await this.requestJson<Ticker24hResponse>(
      `${TICKER_24H_URL}?symbol=${encodeURIComponent(symbol)}`,
    );

    if (typeof body.symbol !== 'string' || body.symbol !== symbol) {
      throw new ServiceUnavailableException('Ticker24h feed unavailable');
    }

    return assertTicker24h(body);
  }

  private async fetchAllTickers24h(): Promise<Map<string, BinanceTicker24h>> {
    const body = await this.requestJson<unknown>(TICKER_24H_URL);

    if (!Array.isArray(body)) {
      throw new ServiceUnavailableException('Ticker24h feed unavailable');
    }

    const map = new Map<string, BinanceTicker24h>();
    for (const item of body) {
      if (
        typeof item !== 'object' ||
        item === null ||
        typeof (item as { symbol?: unknown }).symbol !== 'string'
      ) {
        continue;
      }
      const symbol = (item as { symbol: string }).symbol;
      try {
        map.set(symbol, assertTicker24h(item as Ticker24hResponse));
      } catch {
        // skip malformed entries — most likely irrelevant symbols
      }
    }
    return map;
  }

  private async requestJson<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } catch {
      throw new ServiceUnavailableException('Price feed unavailable');
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new ServiceUnavailableException('Price feed unavailable');
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new ServiceUnavailableException('Price feed unavailable');
    }
  }
}

function assertTicker24h(body: Ticker24hResponse): BinanceTicker24h {
  if (
    typeof body.lastPrice !== 'string' ||
    typeof body.priceChangePercent !== 'string' ||
    typeof body.highPrice !== 'string' ||
    typeof body.lowPrice !== 'string' ||
    typeof body.volume !== 'string' ||
    typeof body.quoteVolume !== 'string'
  ) {
    throw new ServiceUnavailableException('Ticker24h feed unavailable');
  }
  return {
    lastPrice: body.lastPrice,
    priceChangePercent: body.priceChangePercent,
    highPrice: body.highPrice,
    lowPrice: body.lowPrice,
    volume: body.volume,
    quoteVolume: body.quoteVolume,
  };
}

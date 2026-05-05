import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import Decimal from 'decimal.js';

const CACHE_TTL_MS = 1000;
const REQUEST_TIMEOUT_MS = 5000;
const TICKER_URL = 'https://api.binance.com/api/v3/ticker/price';

interface CacheEntry {
  price: Decimal;
  fetchedAt: number;
}

interface TickerResponse {
  symbol?: unknown;
  price?: unknown;
}

@Injectable()
export class BinancePriceService {
  private readonly cache = new Map<string, CacheEntry>();

  async getCurrentPrice(symbol: string): Promise<Decimal> {
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.price;
    }

    const price = await this.fetchPrice(symbol);
    this.cache.set(symbol, { price, fetchedAt: Date.now() });
    return price;
  }

  private async fetchPrice(symbol: string): Promise<Decimal> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(
        `${TICKER_URL}?symbol=${encodeURIComponent(symbol)}`,
        { signal: controller.signal },
      );
    } catch {
      throw new ServiceUnavailableException('Price feed unavailable');
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new ServiceUnavailableException('Price feed unavailable');
    }

    let body: TickerResponse;
    try {
      body = (await response.json()) as TickerResponse;
    } catch {
      throw new ServiceUnavailableException('Price feed unavailable');
    }

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
}

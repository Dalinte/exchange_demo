import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { type RawData, WebSocket } from 'ws';

const BINANCE_COMBINED_URL = 'wss://stream.binance.com:9443/stream';
const MAX_RECONNECT_DELAY_MS = 30_000;
const BASE_RECONNECT_DELAY_MS = 1_000;

export type BinanceStreamCallback = (payload: unknown) => void;

function rawDataToString(raw: RawData): string {
  if (Array.isArray(raw)) return Buffer.concat(raw).toString('utf8');
  if (raw instanceof ArrayBuffer) return Buffer.from(raw).toString('utf8');
  return raw.toString('utf8');
}

interface CombinedStreamMessage {
  stream: string;
  data: unknown;
}

function isCombinedStreamMessage(
  value: unknown,
): value is CombinedStreamMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { stream?: unknown }).stream === 'string' &&
    'data' in value
  );
}

@Injectable()
export class BinanceStreamService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BinanceStreamService.name);
  private readonly subscribers = new Map<string, Set<BinanceStreamCallback>>();

  private ws: WebSocket | null = null;
  private reconnectAttempt = 0;
  private nextRequestId = 1;
  private destroyed = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  onModuleInit(): void {
    this.connect();
  }

  onModuleDestroy(): void {
    this.destroyed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
  }

  subscribe(stream: string, callback: BinanceStreamCallback): void {
    let set = this.subscribers.get(stream);
    const isNewStream = !set || set.size === 0;
    if (!set) {
      set = new Set();
      this.subscribers.set(stream, set);
    }
    set.add(callback);

    if (isNewStream && this.isOpen()) {
      this.sendControl('SUBSCRIBE', [stream]);
    }
  }

  unsubscribe(stream: string, callback: BinanceStreamCallback): void {
    const set = this.subscribers.get(stream);
    if (!set) return;
    set.delete(callback);
    if (set.size === 0) {
      this.subscribers.delete(stream);
      if (this.isOpen()) {
        this.sendControl('UNSUBSCRIBE', [stream]);
      }
    }
  }

  get isConnected(): boolean {
    return this.isOpen();
  }

  private isOpen(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private sendControl(
    method: 'SUBSCRIBE' | 'UNSUBSCRIBE',
    params: string[],
  ): void {
    if (!this.ws) return;
    const id = this.nextRequestId++;
    this.ws.send(JSON.stringify({ method, params, id }));
  }

  private connect(): void {
    if (this.destroyed) return;
    this.logger.log(
      `Connecting to Binance combined streams (${BINANCE_COMBINED_URL})`,
    );

    const ws = new WebSocket(BINANCE_COMBINED_URL);
    this.ws = ws;

    ws.on('open', () => {
      this.reconnectAttempt = 0;
      this.logger.log('Connected to Binance combined streams');
      const activeStreams = [...this.subscribers.keys()];
      if (activeStreams.length > 0) {
        this.logger.log(
          `Re-subscribing to ${activeStreams.length} stream(s): ${activeStreams.join(', ')}`,
        );
        this.sendControl('SUBSCRIBE', activeStreams);
      }
    });

    ws.on('message', (raw: RawData) => {
      this.handleMessage(raw);
    });

    ws.on('error', (err) => {
      this.logger.warn(`Binance WS error: ${err.message}`);
    });

    ws.on('close', (code, reason) => {
      this.logger.warn(
        `Binance WS closed (code=${code}, reason=${reason.toString() || 'n/a'})`,
      );
      this.ws = null;
      this.scheduleReconnect();
    });
  }

  private handleMessage(raw: RawData): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawDataToString(raw));
    } catch (err) {
      this.logger.warn(
        `Failed to parse Binance message: ${(err as Error).message}`,
      );
      return;
    }

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'result' in parsed &&
      'id' in parsed
    ) {
      return;
    }

    if (!isCombinedStreamMessage(parsed)) {
      return;
    }

    const callbacks = this.subscribers.get(parsed.stream);
    if (!callbacks || callbacks.size === 0) return;
    for (const cb of callbacks) {
      try {
        cb(parsed.data);
      } catch (err) {
        this.logger.error(
          `Callback for stream ${parsed.stream} threw: ${(err as Error).message}`,
        );
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.destroyed) return;
    const delay = Math.min(
      BASE_RECONNECT_DELAY_MS * 2 ** this.reconnectAttempt,
      MAX_RECONNECT_DELAY_MS,
    );
    this.reconnectAttempt++;
    this.logger.log(
      `Reconnecting to Binance in ${delay}ms (attempt ${this.reconnectAttempt})`,
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}

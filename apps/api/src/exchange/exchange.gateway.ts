import { Logger, type OnModuleInit } from '@nestjs/common';
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  WSClientMessageSchema,
  WSMessageSchema,
  type WSMessage,
} from '@exchange/shared';
import type { IncomingMessage } from 'http';
import { type RawData, WebSocket, WebSocketServer as WsServer } from 'ws';
import { BinanceStreamService } from '../binance/binance-stream.service';
import { TradingPairsService } from '../trading-pairs/trading-pairs.service';
import {
  binanceKlineToUpdate,
  binanceTickerToUpdate,
  channelToBinanceStream,
  parseChannel,
  type ParsedChannel,
} from './channels';

const MAX_CHANNELS_PER_CLIENT = 20;
const MAX_CONNECTIONS_PER_IP = 10;
const HEARTBEAT_MS = 30_000;
const HEARTBEAT_TIMEOUT_MS = 65_000;
const TOO_MANY_CONNECTIONS_CODE = 4029;

type UpstreamCallback = (payload: unknown) => void;

function rawToString(raw: RawData | RawData[]): string {
  if (Array.isArray(raw)) {
    const buffers = raw.flatMap((part) =>
      Array.isArray(part)
        ? part.map((p) => Buffer.from(p as Buffer))
        : [part instanceof ArrayBuffer ? Buffer.from(part) : (part as Buffer)],
    );
    return Buffer.concat(buffers).toString('utf8');
  }
  if (raw instanceof ArrayBuffer) return Buffer.from(raw).toString('utf8');
  return raw.toString('utf8');
}

interface ClientState {
  ip: string;
  channels: Map<string, { parsed: ParsedChannel; cb: UpstreamCallback }>;
  lastSeen: number;
}

@WebSocketGateway({
  path: '/ws',
  cors: { origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' },
})
export class ExchangeGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit
{
  private readonly logger = new Logger(ExchangeGateway.name);
  private readonly clients = new Map<WebSocket, ClientState>();
  private readonly ipConnections = new Map<string, number>();
  private activeSymbols = new Set<string>();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  @WebSocketServer()
  private server!: WsServer;

  constructor(
    private readonly binanceStream: BinanceStreamService,
    private readonly tradingPairs: TradingPairsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const pairs = await this.tradingPairs.findActive();
    this.activeSymbols = new Set(pairs.map((p) => p.symbol));
    this.logger.log(
      `Loaded ${this.activeSymbols.size} active trading symbols for WS validation`,
    );
  }

  afterInit(): void {
    this.heartbeatTimer = setInterval(() => this.runHeartbeat(), HEARTBEAT_MS);
  }

  handleConnection(client: WebSocket, request: IncomingMessage): void {
    const ip = this.extractIp(request);
    const current = this.ipConnections.get(ip) ?? 0;
    if (current >= MAX_CONNECTIONS_PER_IP) {
      this.logger.warn(`Rejecting connection from ${ip}: too many connections`);
      client.close(TOO_MANY_CONNECTIONS_CODE, 'Too many connections');
      return;
    }
    this.ipConnections.set(ip, current + 1);

    this.clients.set(client, {
      ip,
      channels: new Map(),
      lastSeen: Date.now(),
    });

    client.on('message', (raw) => this.onClientMessage(client, raw));
    client.on('pong', () => {
      const state = this.clients.get(client);
      if (state) state.lastSeen = Date.now();
    });
    client.on('error', (err) => {
      this.logger.warn(`Client WS error from ${ip}: ${err.message}`);
    });
  }

  handleDisconnect(client: WebSocket): void {
    const state = this.clients.get(client);
    if (!state) return;
    for (const { parsed, cb } of state.channels.values()) {
      this.binanceStream.unsubscribe(channelToBinanceStream(parsed), cb);
    }
    state.channels.clear();
    const ipCount = this.ipConnections.get(state.ip) ?? 0;
    if (ipCount <= 1) {
      this.ipConnections.delete(state.ip);
    } else {
      this.ipConnections.set(state.ip, ipCount - 1);
    }
    this.clients.delete(client);
  }

  private extractIp(request: IncomingMessage): string {
    const fwd = request.headers['x-forwarded-for'];
    if (typeof fwd === 'string' && fwd.length > 0) {
      const first = fwd.split(',')[0]?.trim();
      if (first) return first;
    }
    return request.socket.remoteAddress ?? 'unknown';
  }

  private onClientMessage(client: WebSocket, raw: RawData | RawData[]): void {
    let text: string;
    try {
      text = rawToString(raw);
    } catch {
      this.sendError(client, 'Invalid message encoding');
      return;
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      this.sendError(client, 'Malformed JSON');
      return;
    }

    const result = WSClientMessageSchema.safeParse(json);
    if (!result.success) {
      this.sendError(client, 'Invalid message format');
      return;
    }

    const msg = result.data;
    if (msg.type === 'subscribe') {
      for (const channel of msg.channels) {
        this.addSubscription(client, channel);
      }
    } else {
      for (const channel of msg.channels) {
        this.removeSubscription(client, channel);
      }
    }
  }

  private addSubscription(client: WebSocket, channel: string): void {
    const state = this.clients.get(client);
    if (!state) return;

    const parsed = parseChannel(channel);
    if (!parsed) {
      this.sendError(client, `Invalid channel: ${channel}`);
      return;
    }
    if (!this.activeSymbols.has(parsed.symbol)) {
      this.sendError(client, `Unknown symbol: ${parsed.symbol}`);
      return;
    }
    if (state.channels.has(channel)) return;

    if (state.channels.size >= MAX_CHANNELS_PER_CLIENT) {
      this.sendError(client, 'Subscription limit reached');
      return;
    }

    const cb: UpstreamCallback = (payload) =>
      this.dispatchToClient(client, parsed, payload);
    state.channels.set(channel, { parsed, cb });
    this.binanceStream.subscribe(channelToBinanceStream(parsed), cb);
  }

  private removeSubscription(client: WebSocket, channel: string): void {
    const state = this.clients.get(client);
    if (!state) return;
    const entry = state.channels.get(channel);
    if (!entry) return;
    this.binanceStream.unsubscribe(
      channelToBinanceStream(entry.parsed),
      entry.cb,
    );
    state.channels.delete(channel);
  }

  private dispatchToClient(
    client: WebSocket,
    parsed: ParsedChannel,
    payload: unknown,
  ): void {
    if (client.readyState !== WebSocket.OPEN) return;

    let message: WSMessage | null;
    if (parsed.kind === 'kline') {
      message = binanceKlineToUpdate(parsed.symbol, parsed.interval, payload);
    } else {
      message = binanceTickerToUpdate(parsed.symbol, payload);
    }
    if (!message) {
      this.logger.warn(
        `Could not build update for channel ${parsed.kind}:${parsed.symbol}`,
      );
      return;
    }

    const validated = WSMessageSchema.safeParse(message);
    if (!validated.success) {
      this.logger.warn(
        `Outgoing message failed schema validation: ${validated.error.message}`,
      );
      return;
    }

    client.send(JSON.stringify(validated.data));
  }

  private sendError(client: WebSocket, message: string): void {
    if (client.readyState !== WebSocket.OPEN) return;
    const validated = WSMessageSchema.safeParse({ type: 'error', message });
    if (!validated.success) {
      this.logger.warn(
        `Outgoing error failed schema validation: ${validated.error.message}`,
      );
      return;
    }
    client.send(JSON.stringify(validated.data));
  }

  private runHeartbeat(): void {
    const now = Date.now();
    for (const [client, state] of this.clients.entries()) {
      if (now - state.lastSeen > HEARTBEAT_TIMEOUT_MS) {
        this.logger.warn(`Terminating stale WS client (ip=${state.ip})`);
        client.terminate();
        continue;
      }
      if (client.readyState === WebSocket.OPEN) {
        client.ping();
      }
    }
  }
}

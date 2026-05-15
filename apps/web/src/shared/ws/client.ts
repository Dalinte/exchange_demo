import {
  WSMessageSchema,
  WSClientMessageSchema,
  type WSMessage,
  type WSClientMessage,
} from '@exchange/shared';
import { useWsStore } from './ws-store';

export type ConnectionState = 'connecting' | 'open' | 'closed' | 'reconnecting';

type MessageHandler = (message: WSMessage) => void;

const MAX_RECONNECT_DELAY_MS = 30_000;
const BASE_RECONNECT_DELAY_MS = 1_000;
const PING_INTERVAL_MS = 5_000;

class ExchangeWebSocketClient {
  private socket: WebSocket | null = null;
  private readonly messageHandlers = new Set<MessageHandler>();
  private readonly activeSubscriptions = new Set<string>();
  private reconnectAttempts = 0;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly url: string) {}

  connect(): void {
    if (this.socket) return;
    this.setState('connecting');

    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.setState('open');
      if (this.activeSubscriptions.size > 0) {
        this.sendRaw({
          type: 'subscribe',
          channels: Array.from(this.activeSubscriptions),
        });
      }
      this.startPingLoop();
    };

    socket.onmessage = (event) => {
      let raw: unknown;
      try {
        raw = JSON.parse(typeof event.data === 'string' ? event.data : '');
      } catch {
        console.warn('[ws] failed to parse message payload', event.data);
        return;
      }
      const parsed = WSMessageSchema.safeParse(raw);
      if (!parsed.success) {
        console.warn('[ws] invalid message', parsed.error.issues);
        return;
      }
      if (parsed.data.type === 'pong') {
        const rtt = Date.now() - parsed.data.t;
        useWsStore.getState().setLatency(rtt);
        return;
      }
      if (parsed.data.type === 'upstream_status') {
        useWsStore.getState().setUpstreamConnected(parsed.data.connected);
        return;
      }
      for (const handler of this.messageHandlers) handler(parsed.data);
    };

    socket.onerror = () => {
      // closes the socket; onclose will follow and trigger reconnect
    };

    socket.onclose = () => {
      this.socket = null;
      this.stopPingLoop();
      const store = useWsStore.getState();
      store.setLatency(null);
      store.setUpstreamConnected(null);
      this.setState('closed');
      this.scheduleReconnect();
    };
  }

  subscribe(channels: string[]): void {
    const fresh = channels.filter((channel) => !this.activeSubscriptions.has(channel));
    if (fresh.length === 0) return;
    for (const channel of fresh) this.activeSubscriptions.add(channel);
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.sendRaw({ type: 'subscribe', channels: fresh });
    }
  }

  unsubscribe(channels: string[]): void {
    const known = channels.filter((channel) => this.activeSubscriptions.has(channel));
    if (known.length === 0) return;
    for (const channel of known) this.activeSubscriptions.delete(channel);
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.sendRaw({ type: 'unsubscribe', channels: known });
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  private sendRaw(message: WSClientMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const validated = WSClientMessageSchema.parse(message);
    this.socket.send(JSON.stringify(validated));
  }

  private setState(state: ConnectionState): void {
    useWsStore.getState().setConnectionState(state);
  }

  private startPingLoop(): void {
    this.stopPingLoop();
    this.pingTimer = setInterval(() => {
      if (this.socket?.readyState !== WebSocket.OPEN) return;
      this.sendRaw({ type: 'ping', t: Date.now() });
    }, PING_INTERVAL_MS);
  }

  private stopPingLoop(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    this.setState('reconnecting');
    const delay = Math.min(
      BASE_RECONNECT_DELAY_MS * 2 ** this.reconnectAttempts,
      MAX_RECONNECT_DELAY_MS,
    );
    setTimeout(() => {
      this.reconnectAttempts += 1;
      this.connect();
    }, delay);
  }
}

let instance: ExchangeWebSocketClient | null = null;

export function getWsClient(): ExchangeWebSocketClient {
  if (typeof window === 'undefined') {
    throw new Error('WS client is browser-only');
  }
  if (!instance) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!wsUrl) throw new Error('NEXT_PUBLIC_WS_URL is not set');
    instance = new ExchangeWebSocketClient(wsUrl);
    instance.connect();
  }
  return instance;
}

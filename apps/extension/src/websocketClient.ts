import WebSocket from "ws";
import { PIXEL_AGENT_WS_PORT, type PixelAgentEvent } from "@pixel-agent/shared";

export interface PixelAgentWebSocketClientOptions {
  port?: number;
  onStatus?: (message: string) => void;
}

export class PixelAgentWebSocketClient {
  private socket: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private shouldReconnect = true;
  private readonly port: number;

  constructor(private readonly options: PixelAgentWebSocketClientOptions = {}) {
    this.port = options.port ?? PIXEL_AGENT_WS_PORT;
  }

  connect(): void {
    this.shouldReconnect = true;
    this.openSocket();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
    this.options.onStatus?.("Pixel Agent disconnected.");
  }

  send(event: PixelAgentEvent): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    this.socket.send(JSON.stringify(event));
  }

  private openSocket(): void {
    if (this.socket) {
      return;
    }

    const url = `ws://127.0.0.1:${this.port}`;
    this.options.onStatus?.(`Connecting to Pixel Agent at ${url}...`);

    this.socket = new WebSocket(url);

    this.socket.on("open", () => {
      this.options.onStatus?.("Pixel Agent connected.");
    });

    this.socket.on("close", () => {
      this.socket = null;
      this.scheduleReconnect("Pixel Agent connection lost. Retrying in 5 seconds.");
    });

    this.socket.on("error", () => {
      this.options.onStatus?.("Pixel Agent connection error. Retrying in 5 seconds.");
    });
  }

  private scheduleReconnect(message: string): void {
    if (!this.shouldReconnect) {
      return;
    }
    this.options.onStatus?.(message);
    if (this.reconnectTimer) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, 5000);
  }
}

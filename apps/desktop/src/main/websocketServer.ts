import { WebSocketServer, type WebSocket } from "ws";
import {
  isPixelAgentEvent,
  type PixelAgentEvent,
} from "@pixel-agent/shared";

export interface EventWebSocketServerOptions {
  port: number;
  onEvent: (event: PixelAgentEvent) => void;
}

export class EventWebSocketServer {
  private server: WebSocketServer | null = null;
  private readonly clients = new Set<WebSocket>();

  constructor(private readonly options: EventWebSocketServerOptions) {}

  start(): void {
    if (this.server) {
      return;
    }

    this.server = new WebSocketServer({ port: this.options.port });
    this.server.on("connection", (socket) => {
      this.clients.add(socket);
      socket.on("close", () => this.clients.delete(socket));
      socket.on("error", () => this.clients.delete(socket));
      socket.on("message", (raw) => {
        this.handleMessage(raw.toString());
      });
    });

    this.server.on("error", (error) => {
      console.error("[Pixel Agent] WebSocket server error:", error);
    });

    console.log(`[Pixel Agent] WebSocket server listening on ws://127.0.0.1:${this.options.port}`);
  }

  stop(): void {
    for (const client of this.clients) {
      client.close();
    }
    this.clients.clear();
    this.server?.close();
    this.server = null;
  }

  emitLocalEvent(event: PixelAgentEvent): void {
    this.options.onEvent(event);
    this.broadcast(event);
  }

  private handleMessage(raw: string): void {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isPixelAgentEvent(parsed)) {
        console.warn("[Pixel Agent] Ignoring invalid event payload.");
        return;
      }
      this.options.onEvent(parsed);
    } catch (error) {
      console.warn("[Pixel Agent] Failed to parse WebSocket message:", error);
    }
  }

  private broadcast(event: PixelAgentEvent): void {
    const payload = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.readyState === client.OPEN) {
        client.send(payload);
      }
    }
  }
}

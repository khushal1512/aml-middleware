import WebSocket from "ws";
import { EventEmitter } from "events";
import type { Transaction, TxBatchMessage } from "../types/transaction.js";
import { logger } from "../utils/logger.js";
import { settings } from "../config/settings.js";

export class MempoolWSClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connected: boolean = false;
  private reconnectDelay: number = 3000;
  private maxReconnectDelay: number = 30000;
  private currentDelay: number;

  constructor() {
    super();
    this.currentDelay = this.reconnectDelay;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    logger.info("WSClient", `Connecting to ${settings.mempoolWsUrl}`);

    try {
      this.ws = new WebSocket(settings.mempoolWsUrl);
    } catch (err) {
      logger.error("WSClient", "Failed to create WebSocket", err);
      this.scheduleReconnect();
      return;
    }

    this.ws.on("open", () => {
      logger.info("WSClient", "Connected to Mempool server");
      this.connected = true;
      this.currentDelay = this.reconnectDelay;
      this.emit("connected");
    });

    this.ws.on("message", (data: WebSocket.Data) => {
      try {
        const message: TxBatchMessage = JSON.parse(data.toString());
        if (message.type === "tx_batch" && Array.isArray(message.data)) {
          this.emit("transactions", message.data as Transaction[]);
        }
      } catch (err) {
        logger.error("WSClient", "Failed to parse message", err);
      }
    });

    this.ws.on("close", () => {
      logger.warn("WSClient", "Disconnected from Mempool server");
      this.connected = false;
      this.emit("disconnected");
      this.scheduleReconnect();
    });

    this.ws.on("error", (err: Error) => {
      logger.error("WSClient", `WebSocket error: ${err.message}`);
      this.ws?.close();
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    logger.info("WSClient", `Reconnecting in ${this.currentDelay}ms`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
      this.currentDelay = Math.min(
        this.currentDelay * 1.5,
        this.maxReconnectDelay
      );
    }, this.currentDelay);
  }

  isConnected(): boolean {
    return this.connected;
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }
}
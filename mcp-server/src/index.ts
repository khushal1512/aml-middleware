#!/usr/bin/env node

import { createMCPServer } from "./server.js";
import { createStdioTransport } from "./transport/stdio-transport.js";
import { MempoolWSClient } from "./transport/ws-client.js";
import { transactionStore } from "./resources/transaction-store.js";
import { alertFeed } from "./resources/alert-feed.js";
import { logger } from "./utils/logger.js";
import { settings } from "./config/settings.js";
import type { Transaction } from "./types/transaction.js";

async function main(): Promise<void> {
  logger.info("Main", "═══════════════════════════════════════");
  logger.info("Main", "  BTC Forensics MCP Server Starting");
  logger.info("Main", `  Name:    ${settings.serverName}`);
  logger.info("Main", `  Version: ${settings.serverVersion}`);
  logger.info("Main", `  Mempool: ${settings.mempoolWsUrl}`);
  logger.info("Main", "═══════════════════════════════════════");

  // ─── Initialize MCP Server ─────────────────────────
  const server = createMCPServer();
  const transport = createStdioTransport();

  // ─── Initialize WebSocket client to Mempool ────────
  const wsClient = new MempoolWSClient();

  wsClient.on("transactions", (txs: Transaction[]) => {
    transactionStore.addBatch(txs);
    alertFeed.processTransactions(txs);

    logger.debug(
      "Main",
      `Ingested ${txs.length} txs. Store: ${transactionStore.size()}`
    );
  });

  wsClient.on("connected", () => {
    logger.info("Main", "Connected to Mempool server — data flowing");
  });

  wsClient.on("disconnected", () => {
    logger.warn(
      "Main",
      "Disconnected from Mempool — tools still work on cached data"
    );
  });

  // Start WS connection (non-blocking, auto-reconnects)
  wsClient.connect();

  // ─── Connect MCP transport ─────────────────────────
  await server.connect(transport);

  logger.info("Main", "MCP server running on STDIO transport");
  logger.info("Main", "Waiting for client requests...");

  // ─── Graceful shutdown ─────────────────────────────
  const shutdown = async (): Promise<void> => {
    logger.info("Main", "Shutting down...");
    wsClient.disconnect();
    await server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
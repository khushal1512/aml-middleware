import dotenv from "dotenv";

dotenv.config();

export interface AppSettings {
  mempoolWsUrl: string;
  serverName: string;
  serverVersion: string;
  logLevel: "debug" | "info" | "warn" | "error";
  maxTxStore: number;
  riskThresholdHigh: number;
  riskThresholdMedium: number;
}

function getEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function getEnvInt(key: string, fallback: number): number {
  const val = process.env[key];
  if (val === undefined) return fallback;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? fallback : parsed;
}

export const settings: AppSettings = {
  mempoolWsUrl: getEnv("MEMPOOL_WS_URL", "ws://localhost:8080"),
  serverName: getEnv("MCP_SERVER_NAME", "btc-forensics-mcp"),
  serverVersion: getEnv("MCP_SERVER_VERSION", "1.0.0"),
  logLevel: getEnv("LOG_LEVEL", "info") as AppSettings["logLevel"],
  maxTxStore: getEnvInt("MAX_TX_STORE", 5000),
  riskThresholdHigh: getEnvInt("RISK_THRESHOLD_HIGH", 75),
  riskThresholdMedium: getEnvInt("RISK_THRESHOLD_MEDIUM", 40),
};
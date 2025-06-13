import { transactionStore } from "./transaction-store.js";
import type { LiveStats } from "../types/analysis.js";
import { formatDualUnit, patternLabel } from "../utils/formatters.js";

export function getLiveStats(): LiveStats {
  const dist = transactionStore.getPatternDistribution();
  const uptime = transactionStore.getUptimeSeconds();
  const total = transactionStore.size();

  return {
    total_transactions: total,
    total_volume_sats: transactionStore.getTotalVolume(),
    total_fees_sats: transactionStore.getTotalFees(),
    active_chains: transactionStore.getActiveChainCount(),
    pattern_distribution: dist,
    high_risk_count: transactionStore.getHighRiskCount(),
    transactions_per_second: uptime > 0 ? parseFloat((total / uptime).toFixed(2)) : 0,
    uptime_seconds: uptime,
  };
}

export function formatLiveStats(): string {
  const stats = getLiveStats();

  const lines = [
    `══════════════════════════════════════`,
    `  BTC FORENSICS — LIVE STATISTICS`,
    `══════════════════════════════════════`,
    ``,
    `  Transactions:  ${stats.total_transactions}`,
    `  Total Volume:  ${formatDualUnit(stats.total_volume_sats)}`,
    `  Total Fees:    ${formatDualUnit(stats.total_fees_sats)}`,
    `  Active Chains: ${stats.active_chains}`,
    `  High Risk:     ${stats.high_risk_count}`,
    `  TPS:           ${stats.transactions_per_second}`,
    `  Uptime:        ${stats.uptime_seconds}s`,
    ``,
    `  PATTERN DISTRIBUTION:`,
  ];

  for (const [pattern, count] of Object.entries(stats.pattern_distribution)) {
    const pct =
      stats.total_transactions > 0
        ? ((count / stats.total_transactions) * 100).toFixed(1)
        : "0.0";
    lines.push(`    ${patternLabel(pattern).padEnd(14)} ${count} (${pct}%)`);
  }

  lines.push(`══════════════════════════════════════`);
  return lines.join("\n");
}
import type { AlertEntry } from "../types/analysis.js";
import type { Transaction } from "../types/transaction.js";
import { riskCalculator } from "../analysis/risk-calculator.js";
import {
  formatTimestamp,
  truncateHash,
  patternLabel,
  riskLevelEmoji,
  formatDualUnit,
} from "../utils/formatters.js";
import { logger } from "../utils/logger.js";

class AlertFeed {
  private alerts: AlertEntry[] = [];
  private maxAlerts: number = 1000;
  private alertIdCounter: number = 0;

  processTransactions(txs: Transaction[]): AlertEntry[] {
    const newAlerts: AlertEntry[] = [];

    for (const tx of txs) {
      if (tx.pattern_type === "normal") continue;

      const risk = riskCalculator.calculateRisk(tx.txid);

      let severity: AlertEntry["severity"];
      if (risk.score >= 80) severity = "CRITICAL";
      else if (risk.score >= 60) severity = "DANGER";
      else if (risk.score >= 35) severity = "WARNING";
      else severity = "INFO";

      // Only alert on WARNING or higher
      if (severity === "INFO") continue;

      const alert: AlertEntry = {
        id: `alert_${++this.alertIdCounter}`,
        timestamp: tx.timestamp,
        severity,
        pattern_type: tx.pattern_type,
        chain_id: tx.chain_id,
        txid: tx.txid,
        message: this.buildAlertMessage(tx, risk.score),
        risk_score: risk.score,
      };

      newAlerts.push(alert);
      this.alerts.push(alert);
    }

    // Evict old alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }

    if (newAlerts.length > 0) {
      logger.debug("AlertFeed", `Generated ${newAlerts.length} new alerts`);
    }

    return newAlerts;
  }

  private buildAlertMessage(tx: Transaction, riskScore: number): string {
    switch (tx.pattern_type) {
      case "peel_chain":
        return `Peel chain activity detected at hop #${tx.hop_index}. Amount: ${tx.amount_sats} sats. Risk: ${riskScore}/100.`;
      case "coin_burst":
        return `Coin burst (dust) output detected. Amount: ${tx.amount_sats} sats. Possible dust attack or UTXO splitting.`;
      case "mixer":
        return `Mixer/tumbler transaction detected. Amount: ${tx.amount_sats} sats. Funds mixing may indicate laundering.`;
      default:
        return `Suspicious activity: ${tx.pattern_type}. Risk score: ${riskScore}/100.`;
    }
  }

  getRecent(limit: number = 50): AlertEntry[] {
    return this.alerts.slice(-limit);
  }

  getBySeverity(severity: AlertEntry["severity"]): AlertEntry[] {
    return this.alerts.filter((a) => a.severity === severity);
  }

  getAll(): AlertEntry[] {
    return [...this.alerts];
  }

  formatAlertFeed(limit: number = 30): string {
    const recent = this.getRecent(limit);

    if (recent.length === 0) {
      return "No alerts generated yet. Monitoring transactions...";
    }

    const lines = [
      `══════════════════════════════════════`,
      `  ⚠ ALERT FEED (${recent.length} recent)`,
      `══════════════════════════════════════`,
      ``,
    ];

    for (const alert of recent.reverse()) {
      const emoji =
        alert.severity === "CRITICAL"
          ? "🔴"
          : alert.severity === "DANGER"
            ? "🟠"
            : "🟡";
      lines.push(
        `  ${emoji} [${alert.severity.padEnd(8)}] ${formatTimestamp(alert.timestamp)}`
      );
      lines.push(
        `     TX: ${truncateHash(alert.txid, 8)} | ${patternLabel(alert.pattern_type)} | Risk: ${alert.risk_score}/100`
      );
      lines.push(`     ${alert.message}`);
      lines.push(``);
    }

    lines.push(`══════════════════════════════════════`);
    return lines.join("\n");
  }
}

export const alertFeed = new AlertFeed();
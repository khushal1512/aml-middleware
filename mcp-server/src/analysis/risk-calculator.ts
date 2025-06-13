import type { Transaction } from "../types/transaction.js";
import type { RiskScore, RiskFactor } from "../types/analysis.js";
import { transactionStore } from "../resources/transaction-store.js";
import { settings } from "../config/settings.js";

export class RiskCalculator {
  calculateRisk(txid: string): RiskScore {
    const tx = transactionStore.getByTxid(txid);
    if (!tx) {
      return {
        txid,
        score: 0,
        level: "LOW",
        factors: [
          {
            name: "NOT_FOUND",
            weight: 0,
            description: "Transaction not found in store",
          },
        ],
      };
    }

    const factors: RiskFactor[] = [];
    let totalScore = 0;

    // Factor 1: Pattern type
    const patternWeights: Record<string, number> = {
      normal: 0,
      coin_burst: 25,
      peel_chain: 45,
      mixer: 70,
    };
    const patternWeight = patternWeights[tx.pattern_type] ?? 0;
    if (patternWeight > 0) {
      factors.push({
        name: "SUSPICIOUS_PATTERN",
        weight: patternWeight,
        description: `Transaction uses ${tx.pattern_type} pattern (inherent risk)`,
      });
      totalScore += patternWeight;
    }

    // Factor 2: Chain depth
    if (tx.hop_index > 3) {
      const hopRisk = Math.min(tx.hop_index * 3, 20);
      factors.push({
        name: "DEEP_CHAIN",
        weight: hopRisk,
        description: `Transaction is at hop #${tx.hop_index} in its chain`,
      });
      totalScore += hopRisk;
    }

    // Factor 3: Dust amount
    if (tx.amount_sats < 5000) {
      factors.push({
        name: "DUST_AMOUNT",
        weight: 15,
        description: `Very small amount (${tx.amount_sats} sats) may indicate dust attack`,
      });
      totalScore += 15;
    }

    // Factor 4: High fee ratio
    const feeRatio = tx.fee_sats / tx.amount_sats;
    if (feeRatio > 0.1) {
      factors.push({
        name: "HIGH_FEE_RATIO",
        weight: 10,
        description: `Fee is ${(feeRatio * 100).toFixed(1)}% of amount`,
      });
      totalScore += 10;
    }

    // Factor 5: Chain membership with other suspicious txs
    if (tx.chain_id) {
      const chainTxs = transactionStore.getByChainId(tx.chain_id);
      const suspiciousInChain = chainTxs.filter(
        (t) => t.pattern_type === "mixer" || t.pattern_type === "peel_chain"
      ).length;
      if (suspiciousInChain > 2) {
        const chainRisk = Math.min(suspiciousInChain * 5, 25);
        factors.push({
          name: "SUSPICIOUS_CHAIN",
          weight: chainRisk,
          description: `Part of chain with ${suspiciousInChain} suspicious transactions`,
        });
        totalScore += chainRisk;
      }
    }

    // Factor 6: Address reuse across patterns
    const srcTxs = transactionStore.getByAddress(tx.source_address);
    const srcPatterns = new Set(srcTxs.map((t) => t.pattern_type));
    if (srcPatterns.size > 2) {
      factors.push({
        name: "MULTI_PATTERN_ADDRESS",
        weight: 15,
        description: `Source address involved in ${srcPatterns.size} different pattern types`,
      });
      totalScore += 15;
    }

    // Clamp score
    totalScore = Math.min(totalScore, 100);

    // Determine level
    let level: RiskScore["level"];
    if (totalScore >= 80) level = "CRITICAL";
    else if (totalScore >= settings.riskThresholdHigh) level = "HIGH";
    else if (totalScore >= settings.riskThresholdMedium) level = "MEDIUM";
    else level = "LOW";

    return { txid, score: totalScore, level, factors };
  }

  calculateBatchRisk(txids: string[]): RiskScore[] {
    return txids.map((txid) => this.calculateRisk(txid));
  }

  getHighRiskTransactions(threshold: number = 60): RiskScore[] {
    const allTxs = transactionStore.getAll();
    const results: RiskScore[] = [];

    for (const tx of allTxs) {
      const risk = this.calculateRisk(tx.txid);
      if (risk.score >= threshold) {
        results.push(risk);
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }
}

export const riskCalculator = new RiskCalculator();
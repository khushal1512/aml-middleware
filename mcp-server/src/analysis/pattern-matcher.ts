import type { Transaction } from "../types/transaction.js";
import type { PatternDetectionResult } from "../types/analysis.js";
import { transactionStore } from "../resources/transaction-store.js";
import { logger } from "../utils/logger.js";

export class PatternMatcher {
  /**
   * Detect all active patterns in the current store
   */
  detectAllPatterns(): PatternDetectionResult[] {
    const results: PatternDetectionResult[] = [];

    results.push(...this.detectPeelChains());
    results.push(...this.detectCoinBursts());
    results.push(...this.detectMixers());

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Detect peel chain patterns
   */
  detectPeelChains(): PatternDetectionResult[] {
    const chainIds = transactionStore.getAllChainIds();
    const results: PatternDetectionResult[] = [];

    for (const chainId of chainIds) {
      const txs = transactionStore.getByChainId(chainId);
      const peelTxs = txs.filter((t) => t.pattern_type === "peel_chain");

      if (peelTxs.length >= 3) {
        // Check decreasing amounts pattern
        const sorted = [...peelTxs].sort(
          (a, b) => a.hop_index - b.hop_index
        );
        let decreasingCount = 0;
        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i].amount_sats < sorted[i - 1].amount_sats) {
            decreasingCount++;
          }
        }

        const confidence = Math.min(
          (peelTxs.length / 5) * 0.5 +
            (decreasingCount / (sorted.length - 1)) * 0.5,
          1.0
        );

        results.push({
          pattern_type: "peel_chain",
          confidence: confidence * 100,
          chain_id: chainId,
          transactions: sorted,
          description: `Peel chain detected: ${peelTxs.length} hops with ${
            decreasingCount > 0 ? "decreasing" : "varying"
          } amounts. Initial amount: ${sorted[0]?.amount_sats ?? 0} sats.`,
        });
      }
    }

    return results;
  }

  /**
   * Detect coin burst patterns
   */
  detectCoinBursts(): PatternDetectionResult[] {
    const chainIds = transactionStore.getAllChainIds();
    const results: PatternDetectionResult[] = [];

    for (const chainId of chainIds) {
      const txs = transactionStore.getByChainId(chainId);
      const burstTxs = txs.filter((t) => t.pattern_type === "coin_burst");

      if (burstTxs.length >= 5) {
        const avgAmount =
          burstTxs.reduce((s, t) => s + t.amount_sats, 0) / burstTxs.length;
        const isDust = avgAmount < 10000;

        const confidence = Math.min(
          (burstTxs.length / 20) * 0.6 + (isDust ? 0.4 : 0.1),
          1.0
        );

        results.push({
          pattern_type: "coin_burst",
          confidence: confidence * 100,
          chain_id: chainId,
          transactions: burstTxs,
          description: `Coin burst detected: ${burstTxs.length} dust outputs averaging ${Math.round(avgAmount)} sats each.`,
        });
      }
    }

    return results;
  }

  /**
   * Detect mixer/tumbler patterns
   */
  detectMixers(): PatternDetectionResult[] {
    const chainIds = transactionStore.getAllChainIds();
    const results: PatternDetectionResult[] = [];

    for (const chainId of chainIds) {
      const txs = transactionStore.getByChainId(chainId);
      const mixerTxs = txs.filter((t) => t.pattern_type === "mixer");

      if (mixerTxs.length >= 3) {
        const uniqueSources = new Set(mixerTxs.map((t) => t.source_address));
        const uniqueTargets = new Set(mixerTxs.map((t) => t.target_address));

        const confidence = Math.min(
          (uniqueSources.size / 3) * 0.4 +
            (mixerTxs.length / 5) * 0.3 +
            (uniqueTargets.size > 1 ? 0.3 : 0.1),
          1.0
        );

        results.push({
          pattern_type: "mixer",
          confidence: confidence * 100,
          chain_id: chainId,
          transactions: mixerTxs,
          description: `Mixer detected: ${uniqueSources.size} input addresses merged, ${uniqueTargets.size} output addresses. ${mixerTxs.length} transactions involved.`,
        });
      }
    }

    return results;
  }

  /**
   * Analyze a specific transaction for pattern indicators
   */
  analyzeTransaction(txid: string): PatternDetectionResult | null {
    const tx = transactionStore.getByTxid(txid);
    if (!tx) return null;

    if (tx.chain_id) {
      const chainTxs = transactionStore.getByChainId(tx.chain_id);
      const patternTxs = chainTxs.filter(
        (t) => t.pattern_type === tx.pattern_type
      );

      return {
        pattern_type: tx.pattern_type,
        confidence: tx.pattern_type === "normal" ? 0 : 75,
        chain_id: tx.chain_id,
        transactions: patternTxs,
        description: `Transaction ${tx.txid.slice(0, 8)}... is part of a ${tx.pattern_type} chain (${patternTxs.length} txs in chain ${tx.chain_id.slice(0, 8)}...).`,
      };
    }

    return {
      pattern_type: tx.pattern_type,
      confidence: tx.pattern_type === "normal" ? 5 : 50,
      chain_id: null,
      transactions: [tx],
      description: `Standalone ${tx.pattern_type} transaction.`,
    };
  }
}

export const patternMatcher = new PatternMatcher();
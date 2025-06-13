import type { AddressProfile } from "../types/analysis.js";
import type { PatternType } from "../types/transaction.js";
import { transactionStore } from "../resources/transaction-store.js";
import { riskCalculator } from "./risk-calculator.js";

export class AddressClusterer {
  /**
   * Build a full profile for a given address
   */
  profileAddress(address: string): AddressProfile | null {
    const txs = transactionStore.getByAddress(address);
    if (txs.length === 0) return null;

    let totalSent = 0;
    let totalReceived = 0;
    let firstSeen = Infinity;
    let lastSeen = 0;
    const patternsSet = new Set<PatternType>();
    const chainsSet = new Set<string>();
    const connectedAddresses = new Set<string>();

    for (const tx of txs) {
      if (tx.source_address === address) {
        totalSent += tx.amount_sats;
        connectedAddresses.add(tx.target_address);
      }
      if (tx.target_address === address) {
        totalReceived += tx.amount_sats;
        connectedAddresses.add(tx.source_address);
      }
      patternsSet.add(tx.pattern_type);
      if (tx.chain_id) chainsSet.add(tx.chain_id);
      if (tx.timestamp < firstSeen) firstSeen = tx.timestamp;
      if (tx.timestamp > lastSeen) lastSeen = tx.timestamp;
    }

    // Calculate aggregate risk
    let riskSum = 0;
    for (const tx of txs) {
      const risk = riskCalculator.calculateRisk(tx.txid);
      riskSum += risk.score;
    }
    const avgRisk = Math.round(riskSum / txs.length);

    connectedAddresses.delete(address);

    return {
      address,
      total_sent_sats: totalSent,
      total_received_sats: totalReceived,
      transaction_count: txs.length,
      first_seen: firstSeen,
      last_seen: lastSeen,
      patterns_involved: Array.from(patternsSet),
      associated_chains: Array.from(chainsSet),
      risk_score: avgRisk,
      connected_addresses: Array.from(connectedAddresses).slice(0, 50),
    };
  }

  /**
   * Find all addresses connected to a given address within N hops
   */
  findCluster(
    address: string,
    maxHops: number = 3
  ): Map<string, number> {
    const cluster = new Map<string, number>();
    const queue: Array<{ addr: string; depth: number }> = [
      { addr: address, depth: 0 },
    ];

    while (queue.length > 0) {
      const item = queue.shift()!;
      if (cluster.has(item.addr) || item.depth > maxHops) continue;
      cluster.set(item.addr, item.depth);

      const txs = transactionStore.getByAddress(item.addr);
      for (const tx of txs) {
        const otherAddr =
          tx.source_address === item.addr
            ? tx.target_address
            : tx.source_address;
        if (!cluster.has(otherAddr)) {
          queue.push({ addr: otherAddr, depth: item.depth + 1 });
        }
      }
    }

    return cluster;
  }
}

export const addressClusterer = new AddressClusterer();
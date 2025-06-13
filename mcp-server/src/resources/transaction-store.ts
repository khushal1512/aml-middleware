import type { Transaction, PatternType } from "../types/transaction.js";
import { settings } from "../config/settings.js";
import { logger } from "../utils/logger.js";

export class TransactionStore {
  private transactions: Transaction[] = [];
  private txIndex: Map<string, Transaction> = new Map();
  private chainIndex: Map<string, Transaction[]> = new Map();
  private addressIndex: Map<string, Transaction[]> = new Map();
  private parentIndex: Map<string, Transaction[]> = new Map();
  private startTime: number = Date.now();

  addBatch(txs: Transaction[]): void {
    for (const tx of txs) {
      this.transactions.push(tx);
      this.txIndex.set(tx.txid, tx);

      // Chain index
      if (tx.chain_id) {
        const chain = this.chainIndex.get(tx.chain_id) || [];
        chain.push(tx);
        this.chainIndex.set(tx.chain_id, chain);
      }

      // Address index (source)
      const srcTxs = this.addressIndex.get(tx.source_address) || [];
      srcTxs.push(tx);
      this.addressIndex.set(tx.source_address, srcTxs);

      // Address index (target)
      const tgtTxs = this.addressIndex.get(tx.target_address) || [];
      tgtTxs.push(tx);
      this.addressIndex.set(tx.target_address, tgtTxs);

      // Parent index
      if (tx.parent_txid) {
        const children = this.parentIndex.get(tx.parent_txid) || [];
        children.push(tx);
        this.parentIndex.set(tx.parent_txid, children);
      }
    }

    // Evict if over limit
    if (this.transactions.length > settings.maxTxStore) {
      const evictCount = this.transactions.length - settings.maxTxStore;
      const evicted = this.transactions.splice(0, evictCount);
      for (const tx of evicted) {
        this.txIndex.delete(tx.txid);
      }
      logger.debug("TxStore", `Evicted ${evictCount} old transactions`);
    }
  }

  getByTxid(txid: string): Transaction | undefined {
    return this.txIndex.get(txid);
  }

  findByTxidPrefix(prefix: string): Transaction[] {
    const results: Transaction[] = [];
    for (const [key, tx] of this.txIndex) {
      if (key.startsWith(prefix.toLowerCase())) {
        results.push(tx);
      }
    }
    return results;
  }

  getByChainId(chainId: string): Transaction[] {
    return this.chainIndex.get(chainId) || [];
  }

  getByAddress(address: string): Transaction[] {
    return this.addressIndex.get(address) || [];
  }

  getChildrenOf(txid: string): Transaction[] {
    return this.parentIndex.get(txid) || [];
  }

  getByPattern(pattern: PatternType): Transaction[] {
    return this.transactions.filter((tx) => tx.pattern_type === pattern);
  }

  getRecent(limit: number = 50): Transaction[] {
    return this.transactions.slice(-limit);
  }

  getAllChainIds(): string[] {
    return Array.from(this.chainIndex.keys());
  }

  getAllAddresses(): string[] {
    return Array.from(this.addressIndex.keys());
  }

  getAll(): Transaction[] {
    return [...this.transactions];
  }

  size(): number {
    return this.transactions.length;
  }

  getPatternDistribution(): Record<PatternType, number> {
    const dist: Record<PatternType, number> = {
      normal: 0,
      coin_burst: 0,
      peel_chain: 0,
      mixer: 0,
    };
    for (const tx of this.transactions) {
      dist[tx.pattern_type]++;
    }
    return dist;
  }

  getTotalVolume(): number {
    return this.transactions.reduce((s, tx) => s + tx.amount_sats, 0);
  }

  getTotalFees(): number {
    return this.transactions.reduce((s, tx) => s + tx.fee_sats, 0);
  }

  getUptimeSeconds(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  getActiveChainCount(): number {
    return this.chainIndex.size;
  }

  getHighRiskCount(): number {
    return this.transactions.filter(
      (tx) => tx.pattern_type === "mixer" || tx.pattern_type === "peel_chain"
    ).length;
  }
}

// Singleton
export const transactionStore = new TransactionStore();
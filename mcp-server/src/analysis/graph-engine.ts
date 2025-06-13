import type { Transaction } from "../types/transaction.js";
import type { GraphQueryResult } from "../types/analysis.js";
import { transactionStore } from "../resources/transaction-store.js";
import { logger } from "../utils/logger.js";

export class GraphEngine {
  /**
   * Trace full ancestry (upwards via parent_txid) of a transaction
   */
  traceAncestors(txid: string, maxDepth: number = 50): Transaction[] {
    const ancestors: Transaction[] = [];
    const visited = new Set<string>();
    let current = txid;

    for (let depth = 0; depth < maxDepth; depth++) {
      if (visited.has(current)) break;
      visited.add(current);

      const tx = transactionStore.getByTxid(current);
      if (!tx) break;

      if (tx.txid !== txid) {
        ancestors.push(tx);
      }

      if (!tx.parent_txid) break;
      current = tx.parent_txid;
    }

    return ancestors;
  }

  /**
   * Trace all descendants (downwards via parentIndex children) of a transaction
   */
  traceDescendants(txid: string, maxDepth: number = 50): Transaction[] {
    const descendants: Transaction[] = [];
    const visited = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [
      { id: txid, depth: 0 },
    ];

    while (queue.length > 0) {
      const item = queue.shift()!;
      if (visited.has(item.id) || item.depth > maxDepth) continue;
      visited.add(item.id);

      const children = transactionStore.getChildrenOf(item.id);
      for (const child of children) {
        if (!visited.has(child.txid)) {
          descendants.push(child);
          queue.push({ id: child.txid, depth: item.depth + 1 });
        }
      }
    }

    return descendants;
  }

  /**
   * Full graph query: ancestors + descendants + stats
   */
  queryGraph(txid: string, maxDepth: number = 20): GraphQueryResult {
    const ancestors = this.traceAncestors(txid, maxDepth);
    const descendants = this.traceDescendants(txid, maxDepth);

    const allNodes = [...ancestors, ...descendants];
    const rootTx = transactionStore.getByTxid(txid);
    if (rootTx) allNodes.push(rootTx);

    const totalVolume = allNodes.reduce((s, tx) => s + tx.amount_sats, 0);

    return {
      ancestors,
      descendants,
      depth_up: ancestors.length,
      depth_down: descendants.length,
      total_nodes: allNodes.length,
      total_volume_sats: totalVolume,
    };
  }

  /**
   * Find the shortest path between two transactions
   */
  findPath(
    fromTxid: string,
    toTxid: string,
    maxDepth: number = 30
  ): Transaction[] | null {
    const visited = new Set<string>();
    const parentMap = new Map<string, string | null>();
    const queue: Array<{ id: string; depth: number }> = [
      { id: fromTxid, depth: 0 },
    ];
    parentMap.set(fromTxid, null);

    while (queue.length > 0) {
      const item = queue.shift()!;
      if (item.id === toTxid) {
        // Reconstruct path
        const path: Transaction[] = [];
        let cursor: string | null = toTxid;
        while (cursor) {
          const tx = transactionStore.getByTxid(cursor);
          if (tx) path.unshift(tx);
          cursor = parentMap.get(cursor) ?? null;
        }
        return path;
      }

      if (visited.has(item.id) || item.depth > maxDepth) continue;
      visited.add(item.id);

      // Explore children
      const children = transactionStore.getChildrenOf(item.id);
      for (const child of children) {
        if (!visited.has(child.txid)) {
          parentMap.set(child.txid, item.id);
          queue.push({ id: child.txid, depth: item.depth + 1 });
        }
      }

      // Explore parent
      const tx = transactionStore.getByTxid(item.id);
      if (tx?.parent_txid && !visited.has(tx.parent_txid)) {
        parentMap.set(tx.parent_txid, item.id);
        queue.push({ id: tx.parent_txid, depth: item.depth + 1 });
      }
    }

    return null;
  }
}

export const graphEngine = new GraphEngine();
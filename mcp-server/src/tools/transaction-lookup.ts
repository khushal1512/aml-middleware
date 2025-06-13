import { z } from "zod";
import { transactionStore } from "../resources/transaction-store.js";
import {
  formatDualUnit,
  formatTimestamp,
  patternLabel,
  truncateHash,
} from "../utils/formatters.js";
import type { ToolResult } from "../types/mcp.js";

export const transactionLookupSchema = z.object({
  txid: z
    .string()
    .describe(
      "Full or partial transaction ID (hex). Minimum 8 characters for prefix search."
    ),
});

export type TransactionLookupInput = z.infer<typeof transactionLookupSchema>;

export function transactionLookup(input: TransactionLookupInput): ToolResult {
  const { txid } = input;

  // Try exact match first
  let tx = transactionStore.getByTxid(txid);

  if (!tx) {
    // Try prefix search
    const matches = transactionStore.findByTxidPrefix(txid);
    if (matches.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `❌ No transaction found matching "${truncateHash(txid, 12)}". Store contains ${transactionStore.size()} transactions.`,
          },
        ],
      };
    }
    if (matches.length === 1) {
      tx = matches[0];
    } else {
      const list = matches
        .slice(0, 10)
        .map(
          (m) =>
            `  • ${truncateHash(m.txid, 12)} | ${patternLabel(m.pattern_type)} | ${formatDualUnit(m.amount_sats)}`
        )
        .join("\n");
      return {
        content: [
          {
            type: "text",
            text: `⚠️ Multiple matches for prefix "${txid}":\n${list}\n\nPlease provide a more specific TXID.`,
          },
        ],
      };
    }
  }

  const lines = [
    `══════════════════════════════════════`,
    `  TRANSACTION DETAILS`,
    `══════════════════════════════════════`,
    ``,
    `  TXID:       ${tx.txid}`,
    `  Pattern:    ${patternLabel(tx.pattern_type)}`,
    `  Amount:     ${formatDualUnit(tx.amount_sats)}`,
    `  Fee:        ${formatDualUnit(tx.fee_sats)}`,
    `  From:       ${tx.source_address}`,
    `  To:         ${tx.target_address}`,
    `  Timestamp:  ${formatTimestamp(tx.timestamp)}`,
    `  Hop Index:  ${tx.hop_index}`,
    `  Parent TX:  ${tx.parent_txid ?? "None (root)"}`,
    `  Chain ID:   ${tx.chain_id ?? "None (standalone)"}`,
    ``,
  ];

  // Add chain context if available
  if (tx.chain_id) {
    const chainTxs = transactionStore.getByChainId(tx.chain_id);
    lines.push(`  CHAIN CONTEXT:`);
    lines.push(`  Chain size: ${chainTxs.length} transactions`);
    lines.push(
      `  Total chain volume: ${formatDualUnit(chainTxs.reduce((s, t) => s + t.amount_sats, 0))}`
    );
  }

  // Add children info
  const children = transactionStore.getChildrenOf(tx.txid);
  if (children.length > 0) {
    lines.push(`  DESCENDANTS: ${children.length} direct children`);
    for (const child of children.slice(0, 5)) {
      lines.push(
        `    → ${truncateHash(child.txid, 8)} | ${patternLabel(child.pattern_type)} | ${formatDualUnit(child.amount_sats)}`
      );
    }
    if (children.length > 5) {
      lines.push(`    ... and ${children.length - 5} more`);
    }
  }

  lines.push(`══════════════════════════════════════`);

  return {
    content: [{ type: "text", text: lines.join("\n") }],
  };
}

export const transactionLookupDefinition = {
  name: "lookup_transaction",
  description:
    "Look up a Bitcoin transaction by its full or partial TXID. Returns detailed information including pattern type, amounts, addresses, chain context, and descendants.",
  inputSchema: {
    type: "object" as const,
    properties: {
      txid: {
        type: "string",
        description:
          "Full or partial transaction ID (hex string). Minimum 8 characters for prefix search.",
      },
    },
    required: ["txid"],
  },
};
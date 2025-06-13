import { z } from "zod";
import { patternMatcher } from "../analysis/pattern-matcher.js";
import { transactionStore } from "../resources/transaction-store.js";
import {
  formatDualUnit,
  truncateHash,
  patternLabel,
} from "../utils/formatters.js";
import type { ToolResult } from "../types/mcp.js";

export const patternDetectionSchema = z.object({
  pattern_type: z
    .enum(["all", "peel_chain", "coin_burst", "mixer"])
    .default("all")
    .describe("Which pattern type to detect. 'all' runs all detectors."),
  txid: z
    .string()
    .optional()
    .describe("Optionally analyze a specific transaction for pattern indicators."),
});

export type PatternDetectionInput = z.infer<typeof patternDetectionSchema>;

export function patternDetection(input: PatternDetectionInput): ToolResult {
  // Single transaction analysis
  if (input.txid) {
    const result = patternMatcher.analyzeTransaction(input.txid);
    if (!result) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Transaction "${input.txid}" not found in store.`,
          },
        ],
      };
    }

    const lines = [
      `══════════════════════════════════════`,
      `  PATTERN ANALYSIS: ${truncateHash(input.txid, 8)}`,
      `══════════════════════════════════════`,
      ``,
      `  Pattern:     ${patternLabel(result.pattern_type)}`,
      `  Confidence:  ${result.confidence.toFixed(1)}%`,
      `  Chain ID:    ${result.chain_id ?? "None"}`,
      `  Description: ${result.description}`,
      `  Related Txs: ${result.transactions.length}`,
      ``,
    ];

    if (result.transactions.length > 1) {
      lines.push(`  RELATED TRANSACTIONS:`);
      for (const tx of result.transactions.slice(0, 10)) {
        lines.push(
          `    • ${truncateHash(tx.txid, 6)} | HOP ${tx.hop_index} | ${formatDualUnit(tx.amount_sats)}`
        );
      }
    }

    lines.push(`══════════════════════════════════════`);
    return { content: [{ type: "text", text: lines.join("\n") }] };
  }

  // Full pattern scan
  let results = patternMatcher.detectAllPatterns();

  if (input.pattern_type !== "all") {
    results = results.filter((r) => r.pattern_type === input.pattern_type);
  }

  if (results.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: `✅ No ${input.pattern_type === "all" ? "suspicious" : patternLabel(input.pattern_type)} patterns detected. Monitoring ${transactionStore.size()} transactions.`,
        },
      ],
    };
  }

  const lines = [
    `══════════════════════════════════════`,
    `  PATTERN DETECTION REPORT`,
    `  Scanning: ${input.pattern_type === "all" ? "ALL PATTERNS" : patternLabel(input.pattern_type)}`,
    `  Found: ${results.length} pattern(s)`,
    `══════════════════════════════════════`,
    ``,
  ];

  for (const result of results) {
    const totalVol = result.transactions.reduce(
      (s, t) => s + t.amount_sats,
      0
    );
    lines.push(
      `  ┌─ ${patternLabel(result.pattern_type)} | Confidence: ${result.confidence.toFixed(1)}%`
    );
    lines.push(
      `  │  Chain: ${result.chain_id ? truncateHash(result.chain_id, 6) : "N/A"}`
    );
    lines.push(`  │  Transactions: ${result.transactions.length}`);
    lines.push(`  │  Volume: ${formatDualUnit(totalVol)}`);
    lines.push(`  │  ${result.description}`);
    lines.push(`  └────────────────────────────────`);
    lines.push(``);
  }

  lines.push(`══════════════════════════════════════`);

  return { content: [{ type: "text", text: lines.join("\n") }] };
}

export const patternDetectionDefinition = {
  name: "detect_patterns",
  description:
    "Scan the transaction store for suspicious patterns (peel chains, coin bursts, mixers). Can analyze a specific transaction or run a full sweep of all stored data.",
  inputSchema: {
    type: "object" as const,
    properties: {
      pattern_type: {
        type: "string",
        enum: ["all", "peel_chain", "coin_burst", "mixer"],
        description: "Which pattern type to detect. 'all' runs all detectors.",
        default: "all",
      },
      txid: {
        type: "string",
        description:
          "Optionally analyze a specific transaction for pattern indicators.",
      },
    },
    required: [],
  },
};
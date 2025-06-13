import { z } from "zod";
import { transactionStore } from "../resources/transaction-store.js";
import { riskCalculator } from "../analysis/risk-calculator.js";
import {
  formatDualUnit,
  formatTimestamp,
  patternLabel,
  truncateHash,
  truncateAddress,
  riskLevelEmoji,
} from "../utils/formatters.js";
import type { ToolResult } from "../types/mcp.js";

export const chainAnalysisSchema = z.object({
  chain_id: z
    .string()
    .describe("The chain ID to analyze. Use list mode to see available chains."),
  mode: z
    .enum(["detail", "list"])
    .default("detail")
    .describe(
      "'detail' for full chain analysis, 'list' to see all available chain IDs."
    ),
});

export type ChainAnalysisInput = z.infer<typeof chainAnalysisSchema>;

export function chainAnalysis(input: ChainAnalysisInput): ToolResult {
  if (input.mode === "list") {
    const chainIds = transactionStore.getAllChainIds();
    if (chainIds.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No chains currently tracked. Transactions may not have arrived yet.",
          },
        ],
      };
    }

    const lines = [
      `══════════════════════════════════════`,
      `  ACTIVE CHAINS (${chainIds.length})`,
      `══════════════════════════════════════`,
      ``,
    ];

    for (const cid of chainIds) {
      const txs = transactionStore.getByChainId(cid);
      const pattern = txs[0]?.pattern_type ?? "unknown";
      const volume = txs.reduce((s, t) => s + t.amount_sats, 0);
      lines.push(
        `  ${truncateHash(cid, 6)} | ${patternLabel(pattern).padEnd(12)} | ${txs.length} txs | ${formatDualUnit(volume)}`
      );
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }

  // Detail mode
  const txs = transactionStore.getByChainId(input.chain_id);
  if (txs.length === 0) {
    // Try prefix match
    const allChains = transactionStore.getAllChainIds();
    const matches = allChains.filter((c) => c.startsWith(input.chain_id));
    if (matches.length === 1) {
      return chainAnalysis({ chain_id: matches[0], mode: "detail" });
    }
    return {
      content: [
        {
          type: "text",
          text: `❌ Chain "${input.chain_id}" not found. Use mode "list" to see available chains.`,
        },
      ],
    };
  }

  const sorted = [...txs].sort((a, b) => a.hop_index - b.hop_index);
  const totalVolume = txs.reduce((s, t) => s + t.amount_sats, 0);
  const totalFees = txs.reduce((s, t) => s + t.fee_sats, 0);
  const addresses = new Set([
    ...txs.map((t) => t.source_address),
    ...txs.map((t) => t.target_address),
  ]);

  // Calculate aggregate risk
  const risks = txs.map((t) => riskCalculator.calculateRisk(t.txid));
  const maxRisk = Math.max(...risks.map((r) => r.score));
  const avgRisk = Math.round(
    risks.reduce((s, r) => s + r.score, 0) / risks.length
  );
  const maxRiskLevel = risks.reduce((best, r) =>
    r.score > best.score ? r : best
  );

  const lines = [
    `══════════════════════════════════════`,
    `  CHAIN ANALYSIS REPORT`,
    `══════════════════════════════════════`,
    ``,
    `  Chain ID:      ${input.chain_id}`,
    `  Pattern:       ${patternLabel(sorted[0].pattern_type)}`,
    `  Total Hops:    ${sorted.length}`,
    `  Total Volume:  ${formatDualUnit(totalVolume)}`,
    `  Total Fees:    ${formatDualUnit(totalFees)}`,
    `  Unique Addrs:  ${addresses.size}`,
    `  First Seen:    ${formatTimestamp(Math.min(...txs.map((t) => t.timestamp)))}`,
    `  Last Seen:     ${formatTimestamp(Math.max(...txs.map((t) => t.timestamp)))}`,
    ``,
    `  RISK ASSESSMENT:`,
    `  ${riskLevelEmoji(maxRiskLevel.level)} Max Risk Score:  ${maxRisk}/100 (${maxRiskLevel.level})`,
    `  Average Risk:       ${avgRisk}/100`,
    ``,
    `  TRANSACTION FLOW:`,
    `  ─────────────────────────────────`,
  ];

  for (const tx of sorted) {
    const risk = riskCalculator.calculateRisk(tx.txid);
    lines.push(
      `  [HOP ${String(tx.hop_index).padStart(2, "0")}] ${truncateHash(tx.txid, 6)} | ${truncateAddress(tx.source_address, 4)} → ${truncateAddress(tx.target_address, 4)} | ${formatDualUnit(tx.amount_sats)} | ${riskLevelEmoji(risk.level)} ${risk.score}`
    );
  }

  lines.push(`  ─────────────────────────────────`);
  lines.push(`══════════════════════════════════════`);

  return { content: [{ type: "text", text: lines.join("\n") }] };
}

export const chainAnalysisDefinition = {
  name: "analyze_chain",
  description:
    "Analyze a transaction chain by its chain ID. Use mode 'list' to see all available chains, or 'detail' for a full forensic report including risk assessment, transaction flow, and address mapping.",
  inputSchema: {
    type: "object" as const,
    properties: {
      chain_id: {
        type: "string",
        description:
          "The chain ID to analyze. Pass any string when using mode 'list'.",
      },
      mode: {
        type: "string",
        enum: ["detail", "list"],
        description: "'detail' for full analysis, 'list' to see all chain IDs.",
        default: "detail",
      },
    },
    required: ["chain_id"],
  },
};
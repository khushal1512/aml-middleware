import { z } from "zod";
import { riskCalculator } from "../analysis/risk-calculator.js";
import { transactionStore } from "../resources/transaction-store.js";
import {
  formatDualUnit,
  truncateHash,
  patternLabel,
  riskLevelEmoji,
} from "../utils/formatters.js";
import type { ToolResult } from "../types/mcp.js";

export const riskScoringSchema = z.object({
  txid: z
    .string()
    .optional()
    .describe("Transaction ID to score. Omit to get all high-risk transactions."),
  threshold: z
    .number()
    .min(0)
    .max(100)
    .default(50)
    .describe("Minimum risk score threshold (0-100). Default 50."),
});

export type RiskScoringInput = z.infer<typeof riskScoringSchema>;

export function riskScoring(input: RiskScoringInput): ToolResult {
  if (input.txid) {
    // Score a single transaction
    const risk = riskCalculator.calculateRisk(input.txid);
    const tx = transactionStore.getByTxid(input.txid);

    const lines = [
      `══════════════════════════════════════`,
      `  RISK ASSESSMENT`,
      `══════════════════════════════════════`,
      ``,
      `  TXID:    ${input.txid}`,
      `  Score:   ${riskLevelEmoji(risk.level)} ${risk.score}/100`,
      `  Level:   ${risk.level}`,
      ``,
    ];

    if (tx) {
      lines.push(`  Pattern: ${patternLabel(tx.pattern_type)}`);
      lines.push(`  Amount:  ${formatDualUnit(tx.amount_sats)}`);
      lines.push(``);
    }

    lines.push(`  RISK FACTORS:`);
    lines.push(`  ─────────────────────────────────`);

    for (const factor of risk.factors) {
      const bar =
        "█".repeat(Math.round(factor.weight / 5)) +
        "░".repeat(20 - Math.round(factor.weight / 5));
      lines.push(`  [${bar}] ${factor.weight.toString().padStart(3)}pts  ${factor.name}`);
      lines.push(`       ${factor.description}`);
    }

    lines.push(`  ─────────────────────────────────`);
    lines.push(`══════════════════════════════════════`);

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }

  // High-risk overview
  const highRisk = riskCalculator.getHighRiskTransactions(input.threshold);

  if (highRisk.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: `✅ No transactions found with risk score ≥ ${input.threshold}. Currently tracking ${transactionStore.size()} transactions.`,
        },
      ],
    };
  }

  const lines = [
    `══════════════════════════════════════`,
    `  HIGH RISK TRANSACTIONS (score ≥ ${input.threshold})`,
    `  Found: ${highRisk.length}`,
    `══════════════════════════════════════`,
    ``,
  ];

  for (const risk of highRisk.slice(0, 25)) {
    const tx = transactionStore.getByTxid(risk.txid);
    const pattern = tx ? patternLabel(tx.pattern_type) : "UNKNOWN";
    lines.push(
      `  ${riskLevelEmoji(risk.level)} ${risk.score.toString().padStart(3)}/100 | ${truncateHash(risk.txid, 6)} | ${pattern.padEnd(12)} | ${risk.factors.map((f) => f.name).join(", ")}`
    );
  }

  if (highRisk.length > 25) {
    lines.push(`  ... and ${highRisk.length - 25} more`);
  }

  lines.push(`══════════════════════════════════════`);

  return { content: [{ type: "text", text: lines.join("\n") }] };
}

export const riskScoringDefinition = {
  name: "score_risk",
  description:
    "Calculate risk score for a specific transaction, or list all high-risk transactions above a threshold. Returns detailed risk factors and severity levels.",
  inputSchema: {
    type: "object" as const,
    properties: {
      txid: {
        type: "string",
        description:
          "Transaction ID to score. Omit to get all high-risk transactions.",
      },
      threshold: {
        type: "number",
        description:
          "Minimum risk score threshold (0-100). Default 50. Only used when txid is omitted.",
        default: 50,
      },
    },
    required: [],
  },
};
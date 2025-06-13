import { z } from "zod";
import { graphEngine } from "../analysis/graph-engine.js";
import { transactionStore } from "../resources/transaction-store.js";
import {
  formatDualUnit,
  truncateHash,
  truncateAddress,
  patternLabel,
} from "../utils/formatters.js";
import type { ToolResult } from "../types/mcp.js";

export const graphQuerySchema = z.object({
  txid: z.string().describe("Transaction ID to trace."),
  direction: z
    .enum(["ancestors", "descendants", "both", "path"])
    .default("both")
    .describe(
      "'ancestors' traces funds backward, 'descendants' forward, 'both' traces both, 'path' finds path between two txids."
    ),
  target_txid: z
    .string()
    .optional()
    .describe("Target TXID for path finding (required when direction is 'path')."),
  max_depth: z
    .number()
    .min(1)
    .max(50)
    .default(15)
    .describe("Maximum traversal depth. Default 15."),
});

export type GraphQueryInput = z.infer<typeof graphQuerySchema>;

export function graphQuery(input: GraphQueryInput): ToolResult {
  const rootTx = transactionStore.getByTxid(input.txid);
  if (!rootTx) {
    return {
      content: [
        {
          type: "text",
          text: `❌ Transaction "${truncateHash(input.txid, 12)}" not found.`,
        },
      ],
    };
  }

  // Path finding mode
  if (input.direction === "path") {
    if (!input.target_txid) {
      return {
        content: [
          {
            type: "text",
            text: `❌ target_txid is required for path finding.`,
          },
        ],
      };
    }

    const path = graphEngine.findPath(
      input.txid,
      input.target_txid,
      input.max_depth
    );

    if (!path) {
      return {
        content: [
          {
            type: "text",
            text: `❌ No path found between ${truncateHash(input.txid, 6)} and ${truncateHash(input.target_txid, 6)} within ${input.max_depth} hops.`,
          },
        ],
      };
    }

    const lines = [
      `══════════════════════════════════════`,
      `  PATH TRACE`,
      `  From: ${truncateHash(input.txid, 8)}`,
      `  To:   ${truncateHash(input.target_txid, 8)}`,
      `  Hops: ${path.length - 1}`,
      `══════════════════════════════════════`,
      ``,
    ];

    for (let i = 0; i < path.length; i++) {
      const tx = path[i];
      const prefix = i === 0 ? "START" : i === path.length - 1 ? "END  " : `HOP ${String(i).padStart(2, "0")}`;
      lines.push(
        `  [${prefix}] ${truncateHash(tx.txid, 6)} | ${truncateAddress(tx.source_address, 4)} → ${truncateAddress(tx.target_address, 4)} | ${formatDualUnit(tx.amount_sats)} | ${patternLabel(tx.pattern_type)}`
      );
      if (i < path.length - 1) {
        lines.push(`     │`);
        lines.push(`     ▼`);
      }
    }

    lines.push(`══════════════════════════════════════`);
    return { content: [{ type: "text", text: lines.join("\n") }] };
  }

  // Standard graph query
  const result = graphEngine.queryGraph(input.txid, input.max_depth);

  const lines = [
    `══════════════════════════════════════`,
    `  GRAPH QUERY: ${truncateHash(input.txid, 8)}`,
    `══════════════════════════════════════`,
    ``,
    `  Root TX:       ${patternLabel(rootTx.pattern_type)}`,
    `  Root Amount:   ${formatDualUnit(rootTx.amount_sats)}`,
    `  Total Nodes:   ${result.total_nodes}`,
    `  Total Volume:  ${formatDualUnit(result.total_volume_sats)}`,
    `  Depth Up:      ${result.depth_up}`,
    `  Depth Down:    ${result.depth_down}`,
    ``,
  ];

  if (
    (input.direction === "ancestors" || input.direction === "both") &&
    result.ancestors.length > 0
  ) {
    lines.push(`  ANCESTORS (${result.ancestors.length}):`);
    lines.push(`  ─────────────────────────────────`);
    for (const tx of result.ancestors.slice(0, 15)) {
      lines.push(
        `    ↑ ${truncateHash(tx.txid, 6)} | ${patternLabel(tx.pattern_type).padEnd(12)} | ${formatDualUnit(tx.amount_sats)}`
      );
    }
    if (result.ancestors.length > 15) {
      lines.push(`    ... +${result.ancestors.length - 15} more`);
    }
    lines.push(``);
  }

  lines.push(`  ● ROOT: ${truncateHash(input.txid, 6)}`);
  lines.push(``);

  if (
    (input.direction === "descendants" || input.direction === "both") &&
    result.descendants.length > 0
  ) {
    lines.push(`  DESCENDANTS (${result.descendants.length}):`);
    lines.push(`  ─────────────────────────────────`);
    for (const tx of result.descendants.slice(0, 15)) {
      lines.push(
        `    ↓ ${truncateHash(tx.txid, 6)} | ${patternLabel(tx.pattern_type).padEnd(12)} | ${formatDualUnit(tx.amount_sats)}`
      );
    }
    if (result.descendants.length > 15) {
      lines.push(`    ... +${result.descendants.length - 15} more`);
    }
  }

  lines.push(`══════════════════════════════════════`);

  return { content: [{ type: "text", text: lines.join("\n") }] };
}

export const graphQueryDefinition = {
  name: "query_graph",
  description:
    "Trace the transaction graph from a given TXID. Can trace ancestors (where funds came from), descendants (where they went), both directions, or find a path between two transactions.",
  inputSchema: {
    type: "object" as const,
    properties: {
      txid: {
        type: "string",
        description: "Transaction ID to start tracing from.",
      },
      direction: {
        type: "string",
        enum: ["ancestors", "descendants", "both", "path"],
        description:
          "'ancestors' traces backward, 'descendants' forward, 'both' both directions, 'path' finds path to target_txid.",
        default: "both",
      },
      target_txid: {
        type: "string",
        description:
          "Target TXID for path finding. Required when direction is 'path'.",
      },
      max_depth: {
        type: "number",
        description: "Maximum traversal depth (1-50). Default 15.",
        default: 15,
      },
    },
    required: ["txid"],
  },
};
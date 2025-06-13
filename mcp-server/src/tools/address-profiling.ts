import { z } from "zod";
import { addressClusterer } from "../analysis/address-clusterer.js";
import { transactionStore } from "../resources/transaction-store.js";
import {
  formatDualUnit,
  formatTimestamp,
  truncateAddress,
  truncateHash,
  patternLabel,
  riskLevelEmoji,
} from "../utils/formatters.js";
import type { ToolResult } from "../types/mcp.js";

export const addressProfilingSchema = z.object({
  address: z
    .string()
    .describe("Bitcoin address to profile."),
  include_cluster: z
    .boolean()
    .default(false)
    .describe("Whether to include address clustering analysis (may be slow for large graphs)."),
  cluster_depth: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe("Max hops for cluster analysis. Default 2."),
});

export type AddressProfilingInput = z.infer<typeof addressProfilingSchema>;

export function addressProfiling(input: AddressProfilingInput): ToolResult {
  const profile = addressClusterer.profileAddress(input.address);

  if (!profile) {
    // Try partial match
    const allAddrs = transactionStore.getAllAddresses();
    const partials = allAddrs.filter((a) =>
      a.toLowerCase().includes(input.address.toLowerCase())
    );

    if (partials.length > 0) {
      const list = partials
        .slice(0, 10)
        .map((a) => `  • ${a}`)
        .join("\n");
      return {
        content: [
          {
            type: "text",
            text: `❌ Exact address not found. Similar addresses:\n${list}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `❌ Address "${truncateAddress(input.address, 8)}" not found in any tracked transactions.`,
        },
      ],
    };
  }

  const riskLevel =
    profile.risk_score >= 75
      ? "CRITICAL"
      : profile.risk_score >= 50
        ? "HIGH"
        : profile.risk_score >= 30
          ? "MEDIUM"
          : "LOW";

  const lines = [
    `══════════════════════════════════════`,
    `  ADDRESS PROFILE`,
    `══════════════════════════════════════`,
    ``,
    `  Address:       ${profile.address}`,
    `  Total Sent:    ${formatDualUnit(profile.total_sent_sats)}`,
    `  Total Recv:    ${formatDualUnit(profile.total_received_sats)}`,
    `  Net Flow:      ${formatDualUnit(profile.total_received_sats - profile.total_sent_sats)}`,
    `  Tx Count:      ${profile.transaction_count}`,
    `  First Seen:    ${formatTimestamp(profile.first_seen)}`,
    `  Last Seen:     ${formatTimestamp(profile.last_seen)}`,
    `  Risk Score:    ${riskLevelEmoji(riskLevel)} ${profile.risk_score}/100 (${riskLevel})`,
    ``,
    `  PATTERNS INVOLVED:`,
    `  ${profile.patterns_involved.map(patternLabel).join(", ") || "None"}`,
    ``,
    `  ASSOCIATED CHAINS:`,
    `  ${profile.associated_chains.map((c) => truncateHash(c, 4)).join(", ") || "None"}`,
    ``,
    `  CONNECTED ADDRESSES (${profile.connected_addresses.length}):`,
  ];

  for (const addr of profile.connected_addresses.slice(0, 10)) {
    lines.push(`    → ${addr}`);
  }
  if (profile.connected_addresses.length > 10) {
    lines.push(
      `    ... and ${profile.connected_addresses.length - 10} more`
    );
  }

  // Cluster analysis
  if (input.include_cluster) {
    const cluster = addressClusterer.findCluster(
      input.address,
      input.cluster_depth
    );
    lines.push(``);
    lines.push(
      `  CLUSTER ANALYSIS (depth ${input.cluster_depth}):`
    );
    lines.push(`  Total addresses in cluster: ${cluster.size}`);

    const byDepth = new Map<number, string[]>();
    cluster.forEach((depth, addr) => {
      const arr = byDepth.get(depth) || [];
      arr.push(addr);
      byDepth.set(depth, arr);
    });

    for (const [depth, addrs] of Array.from(byDepth.entries()).sort(
      (a, b) => a[0] - b[0]
    )) {
      lines.push(
        `    Depth ${depth}: ${addrs.length} address(es)`
      );
      for (const a of addrs.slice(0, 3)) {
        lines.push(`      ${truncateAddress(a, 8)}`);
      }
      if (addrs.length > 3) {
        lines.push(`      ... +${addrs.length - 3} more`);
      }
    }
  }

  lines.push(`══════════════════════════════════════`);

  return { content: [{ type: "text", text: lines.join("\n") }] };
}

export const addressProfilingDefinition = {
  name: "profile_address",
  description:
    "Build a comprehensive profile for a Bitcoin address including transaction history, risk scoring, pattern involvement, and optional cluster analysis showing connected addresses.",
  inputSchema: {
    type: "object" as const,
    properties: {
      address: {
        type: "string",
        description: "Bitcoin address to profile.",
      },
      include_cluster: {
        type: "boolean",
        description:
          "Whether to include address clustering analysis. Default false.",
        default: false,
      },
      cluster_depth: {
        type: "number",
        description: "Max hops for cluster analysis (1-5). Default 2.",
        default: 2,
      },
    },
    required: ["address"],
  },
};
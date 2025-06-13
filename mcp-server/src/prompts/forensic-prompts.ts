export interface PromptDefinition {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
}

export interface PromptMessage {
  role: "user" | "assistant";
  content: {
    type: "text";
    text: string;
  };
}

export const promptDefinitions: PromptDefinition[] = [
  {
    name: "investigate_transaction",
    description:
      "Start a forensic investigation of a specific transaction. Generates a comprehensive prompt to guide the LLM through looking up, scoring, and tracing the transaction.",
    arguments: [
      {
        name: "txid",
        description: "The transaction ID to investigate.",
        required: true,
      },
    ],
  },
  {
    name: "risk_assessment_report",
    description:
      "Generate a risk assessment report for the current state of the system. Identifies all high-risk patterns and provides recommendations.",
    arguments: [
      {
        name: "threshold",
        description: "Minimum risk score to include (default 40).",
        required: false,
      },
    ],
  },
  {
    name: "trace_funds",
    description:
      "Trace the flow of funds from a specific transaction, analyzing where money came from and where it went.",
    arguments: [
      {
        name: "txid",
        description: "The transaction ID to trace from.",
        required: true,
      },
      {
        name: "direction",
        description: "'upstream' to trace origins, 'downstream' for destinations, 'both' for full trace.",
        required: false,
      },
    ],
  },
  {
    name: "address_investigation",
    description:
      "Investigate a Bitcoin address for suspicious activity, transaction patterns, and connections to other addresses.",
    arguments: [
      {
        name: "address",
        description: "The Bitcoin address to investigate.",
        required: true,
      },
    ],
  },
  {
    name: "pattern_hunt",
    description:
      "Scan the entire transaction store for specific suspicious patterns and provide a detailed analysis.",
    arguments: [
      {
        name: "pattern",
        description: "Pattern to hunt: 'peel_chain', 'mixer', 'coin_burst', or 'all'.",
        required: false,
      },
    ],
  },
  {
    name: "chain_deep_dive",
    description:
      "Perform a deep dive analysis of a specific transaction chain, examining every hop and building a narrative.",
    arguments: [
      {
        name: "chain_id",
        description: "The chain ID to analyze in depth.",
        required: true,
      },
    ],
  },
];

export function buildPromptMessages(
  name: string,
  args: Record<string, string>
): PromptMessage[] {
  switch (name) {
    case "investigate_transaction":
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: `I need you to conduct a full forensic investigation of Bitcoin transaction ${args.txid}. Please:

1. First, use the lookup_transaction tool to get the transaction details.
2. Then, use the score_risk tool to assess its risk level.
3. Use query_graph to trace its ancestors and descendants.
4. If it belongs to a chain, use analyze_chain to understand the full chain.
5. Use detect_patterns to check if it's part of a known suspicious pattern.
6. Check the profile_address tool on both the source and target addresses.

After gathering all this data, provide me with:
- A summary of what this transaction is doing
- Whether it appears suspicious and why
- The full money flow path
- Recommendations for further investigation
- A risk rating on a scale of 1-10 with justification`,
          },
        },
      ];

    case "risk_assessment_report":
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: `Generate a comprehensive risk assessment report for the current Bitcoin forensics system. Use threshold ${args.threshold || "40"}.

Please:
1. First check the live statistics using the btcforensics://stats/live resource.
2. Use score_risk tool without a txid to get all high-risk transactions.
3. Use detect_patterns to find all active suspicious patterns.
4. Check the recent alerts using btcforensics://alerts/recent resource.

Provide a structured report with:
- Executive Summary
- Current Threat Level (LOW/MEDIUM/HIGH/CRITICAL)
- Active Suspicious Patterns (with details)
- Top 5 Highest Risk Transactions
- Recommended Actions
- Statistical Overview`,
          },
        },
      ];

    case "trace_funds":
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: `Trace the flow of funds for transaction ${args.txid}. Direction: ${args.direction || "both"}.

Please:
1. Use lookup_transaction to identify the starting transaction.
2. Use query_graph with direction "${args.direction || "both"}" to map the fund flow.
3. For each significant node in the path, use score_risk to assess risk.
4. If any nodes are part of chains, use analyze_chain for context.

Present the results as:
- A narrative describing the flow of funds
- A text-based visualization of the transaction path
- Risk assessment at each hop
- Total value flowing through the path
- Any red flags or suspicious patterns discovered along the way`,
          },
        },
      ];

    case "address_investigation":
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: `Investigate Bitcoin address ${args.address} for suspicious activity.

Please:
1. Use profile_address with include_cluster=true to get the full address profile.
2. For each suspicious transaction involving this address, use score_risk.
3. Use detect_patterns to check if any patterns involve this address.
4. Check connected addresses for additional suspicious activity.

Provide:
- Address Summary (balance flow, activity timeline)
- Risk Assessment
- Pattern Involvement
- Connected Suspicious Addresses
- Recommendations for monitoring or blocking`,
          },
        },
      ];

    case "pattern_hunt":
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: `Perform a pattern hunt across all stored transactions. Focus: ${args.pattern || "all"} patterns.

Please:
1. Read the pattern reference at btcforensics://config/patterns for context.
2. Use detect_patterns with pattern_type="${args.pattern || "all"}".
3. For each detected pattern, use analyze_chain to get chain details.
4. Use score_risk on the highest-risk transactions in each pattern.

Report should include:
- Patterns Detected (count and types)
- Detailed breakdown of each pattern instance
- Confidence levels and evidence
- Cross-pattern connections (addresses appearing in multiple patterns)
- Priority ranking for investigation`,
          },
        },
      ];

    case "chain_deep_dive":
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: `Perform a deep dive analysis of chain ${args.chain_id}.

Please:
1. Use analyze_chain with mode "detail" for the full chain report.
2. Use detect_patterns with the chain's pattern type to understand context.
3. For each transaction in the chain, use score_risk to build a risk timeline.
4. Use profile_address on the first and last addresses in the chain.
5. Use query_graph on the root transaction to find any connected graphs.

Provide a forensic narrative:
- Chain Overview (type, length, total volume)
- Hop-by-Hop Analysis with risk commentary
- Origin Analysis (who started this chain?)
- Destination Analysis (where did the funds end up?)
- Timeline reconstruction
- Threat assessment and confidence level
- Recommended next steps for investigators`,
          },
        },
      ];

    default:
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: `Unknown prompt "${name}". Available prompts: ${promptDefinitions.map((p) => p.name).join(", ")}`,
          },
        },
      ];
  }
}
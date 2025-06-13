import { formatLiveStats, getLiveStats } from "./live-stats.js";
import { alertFeed } from "./alert-feed.js";
import { transactionStore } from "./transaction-store.js";
import type { ResourceContent } from "../types/mcp.js";

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export const resourceDefinitions: ResourceDefinition[] = [
  {
    uri: "btcforensics://stats/live",
    name: "Live Statistics",
    description:
      "Real-time statistics of the Bitcoin forensics system including transaction counts, volume, pattern distribution, and risk metrics.",
    mimeType: "text/plain",
  },
  {
    uri: "btcforensics://alerts/recent",
    name: "Recent Alerts",
    description:
      "Feed of recent security alerts triggered by suspicious transaction patterns. Includes peel chains, mixers, and coin bursts.",
    mimeType: "text/plain",
  },
  {
    uri: "btcforensics://transactions/recent",
    name: "Recent Transactions",
    description:
      "The most recent 50 transactions received from the Mempool server, formatted as a readable ledger.",
    mimeType: "text/plain",
  },
  {
    uri: "btcforensics://config/patterns",
    name: "Pattern Definitions",
    description:
      "Reference guide for all suspicious transaction patterns that the system detects and monitors.",
    mimeType: "text/plain",
  },
];

export function readResource(uri: string): ResourceContent | null {
  switch (uri) {
    case "btcforensics://stats/live":
      return {
        uri,
        mimeType: "text/plain",
        text: formatLiveStats(),
      };

    case "btcforensics://alerts/recent":
      return {
        uri,
        mimeType: "text/plain",
        text: alertFeed.formatAlertFeed(30),
      };

    case "btcforensics://transactions/recent": {
      const recent = transactionStore.getRecent(50);
      if (recent.length === 0) {
        return {
          uri,
          mimeType: "text/plain",
          text: "No transactions received yet.",
        };
      }

      const lines = recent.map(
        (tx) =>
          `${new Date(tx.timestamp).toISOString()} | ${tx.txid.slice(0, 12)}... | ${tx.pattern_type.padEnd(11)} | ${tx.amount_sats} sat | ${tx.source_address.slice(0, 8)}...→${tx.target_address.slice(0, 8)}... | hop:${tx.hop_index}`
      );
      return {
        uri,
        mimeType: "text/plain",
        text: `RECENT TRANSACTIONS (${recent.length}):\n${"─".repeat(50)}\n${lines.join("\n")}`,
      };
    }

    case "btcforensics://config/patterns":
      return {
        uri,
        mimeType: "text/plain",
        text: PATTERN_REFERENCE,
      };

    default:
      return null;
  }
}

const PATTERN_REFERENCE = `
══════════════════════════════════════
  PATTERN REFERENCE GUIDE
══════════════════════════════════════

1. NORMAL
   Standard 1-to-1 or 1-to-2 transaction.
   No inherent risk. May chain naturally.
   Risk Factor: 0

2. PEEL CHAIN
   A large input where a small "peel" amount goes to a
   new address each hop. The remainder continues.
   Used to slowly extract funds while obscuring origin.
   Indicators: 5+ sequential hops, decreasing amounts.
   Risk Factor: 45

3. COIN BURST
   A single source UTXO splits into 20+ small "dust"
   outputs. May indicate dust attacks, UTXO grinding,
   or preparation for a CoinJoin.
   Indicators: Many outputs < 10,000 sats from one source.
   Risk Factor: 25

4. MIXER / TUMBLER
   Multiple unrelated inputs merge into one complex
   transaction, then split into fresh addresses.
   Classic money laundering pattern.
   Indicators: N inputs from different addresses → M fresh outputs.
   Risk Factor: 70

══════════════════════════════════════
`;
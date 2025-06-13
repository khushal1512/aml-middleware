import type { PatternType, Transaction } from "./transaction.js";

export interface RiskScore {
  txid: string;
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  factors: RiskFactor[];
}

export interface RiskFactor {
  name: string;
  weight: number;
  description: string;
}

export interface ChainAnalysis {
  chain_id: string;
  pattern_type: PatternType;
  total_hops: number;
  total_volume_sats: number;
  total_fees_sats: number;
  addresses_involved: string[];
  transactions: Transaction[];
  risk_score: number;
  first_seen: number;
  last_seen: number;
}

export interface AddressProfile {
  address: string;
  total_sent_sats: number;
  total_received_sats: number;
  transaction_count: number;
  first_seen: number;
  last_seen: number;
  patterns_involved: PatternType[];
  associated_chains: string[];
  risk_score: number;
  connected_addresses: string[];
}

export interface PatternDetectionResult {
  pattern_type: PatternType;
  confidence: number;
  chain_id: string | null;
  transactions: Transaction[];
  description: string;
}

export interface GraphQueryResult {
  ancestors: Transaction[];
  descendants: Transaction[];
  depth_up: number;
  depth_down: number;
  total_nodes: number;
  total_volume_sats: number;
}

export interface LiveStats {
  total_transactions: number;
  total_volume_sats: number;
  total_fees_sats: number;
  active_chains: number;
  pattern_distribution: Record<PatternType, number>;
  high_risk_count: number;
  transactions_per_second: number;
  uptime_seconds: number;
}

export interface AlertEntry {
  id: string;
  timestamp: number;
  severity: "INFO" | "WARNING" | "DANGER" | "CRITICAL";
  pattern_type: PatternType;
  chain_id: string | null;
  txid: string;
  message: string;
  risk_score: number;
}
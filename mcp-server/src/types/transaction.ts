export type PatternType = "normal" | "coin_burst" | "peel_chain" | "mixer";

export interface Transaction {
  txid: string;
  source_address: string;
  target_address: string;
  amount_sats: number;
  fee_sats: number;
  pattern_type: PatternType;
  hop_index: number;
  timestamp: number;
  parent_txid: string | null;
  chain_id: string | null;
}

export interface TxBatchMessage {
  type: "tx_batch";
  data: Transaction[];
  server_time: number;
}
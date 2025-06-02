import React from 'react';
import { Transaction } from '../types/transaction';
import {
  truncateHash,
  truncateAddress,
  formatTimestamp,
  patternLabel,
  patternColor,
} from '../utils/formatters';
import { useUnit } from '../context/UnitContext';

interface AlertsPanelProps {
  transactions: Transaction[];
}

export default function AlertsPanel({ transactions }: AlertsPanelProps) {
  const { convert } = useUnit();

  const alerts = transactions.filter(
    (tx) => tx.pattern_type === 'peel_chain' || tx.pattern_type === 'mixer'
  );

  // Group by chain_id
  const chainMap = new Map<string, Transaction[]>();
  const unchained: Transaction[] = [];

  alerts.forEach((tx) => {
    if (tx.chain_id) {
      const group = chainMap.get(tx.chain_id) || [];
      group.push(tx);
      chainMap.set(tx.chain_id, group);
    } else {
      unchained.push(tx);
    }
  });

  return (
    <div className="retro-border flex flex-col h-full">
      <div className="border-b-2 border-charcoal px-3 py-2 flex items-center justify-between flex-shrink-0">
        <span className="font-data text-[10px] uppercase tracking-[0.15em] text-accent-red">
          ⚠ RED FLAG LOG — {alerts.length} ALERTS
        </span>
      </div>

      <div className="overflow-y-auto flex-1" style={{ maxHeight: '600px' }}>
        {/* Chained Alerts */}
        {Array.from(chainMap.entries()).map(([chainId, txs]) => {
          const patternType = txs[0].pattern_type;
          const totalAmount = txs.reduce((s, tx) => s + tx.amount_sats, 0);

          return (
            <div key={chainId} className="border-b-2 border-charcoal">
              {/* Chain Header */}
              <div
                className="px-3 py-2 flex items-center justify-between"
                style={{
                  borderLeft: `4px solid ${patternColor(patternType)}`,
                  backgroundColor: patternType === 'mixer' ? '#fef2f2' : '#fffbeb',
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="font-data text-[11px] font-bold danger-pulse"
                    style={{ color: patternColor(patternType) }}
                  >
                    {patternLabel(patternType)}
                  </span>
                  <span className="font-data text-[9px] opacity-50">
                    CHAIN: {truncateHash(chainId, 4)}
                  </span>
                </div>
                <div className="font-data text-[10px]">
                  {txs.length} hops · {convert(totalAmount)}
                </div>
              </div>

              {/* Chain Transactions */}
              {txs
                .sort((a, b) => a.hop_index - b.hop_index)
                .map((tx, idx) => (
                  <div
                    key={tx.txid + idx}
                    className="px-3 py-1 font-data text-[9px] border-b border-charcoal border-opacity-20 flex items-center gap-3"
                    style={{
                      paddingLeft: `${20 + tx.hop_index * 12}px`,
                      borderLeft: `4px solid ${patternColor(patternType)}`,
                    }}
                  >
                    <span className="opacity-40">HOP {tx.hop_index}</span>
                    <span className="opacity-60">{formatTimestamp(tx.timestamp)}</span>
                    <span className="font-bold">{truncateHash(tx.txid, 5)}</span>
                    <span className="opacity-60">
                      {truncateAddress(tx.source_address, 3)} →{' '}
                      {truncateAddress(tx.target_address, 3)}
                    </span>
                    <span>{convert(tx.amount_sats)}</span>
                  </div>
                ))}
            </div>
          );
        })}

        {/* Unchained Alerts */}
        {unchained.map((tx, i) => (
          <div
            key={tx.txid + i}
            className="px-3 py-2 font-data text-[10px] border-b border-charcoal flex items-center gap-3"
            style={{
              borderLeft: `4px solid ${patternColor(tx.pattern_type)}`,
            }}
          >
            <span
              className="font-bold danger-pulse"
              style={{ color: patternColor(tx.pattern_type) }}
            >
              {patternLabel(tx.pattern_type)}
            </span>
            <span className="opacity-60">{formatTimestamp(tx.timestamp)}</span>
            <span className="font-bold">{truncateHash(tx.txid, 5)}</span>
            <span>{convert(tx.amount_sats)}</span>
          </div>
        ))}

        {alerts.length === 0 && (
          <div className="px-3 py-8 text-center font-data text-xs opacity-40">
            NO SUSPICIOUS ACTIVITY DETECTED YET...
          </div>
        )}
      </div>
    </div>
  );
}
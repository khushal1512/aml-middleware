import React, { useRef, useEffect, useState } from 'react';
import { Transaction } from '../types/transaction';
import {
  truncateHash,
  truncateAddress,
  formatTimestamp,
  patternLabel,
  patternColor,
  isSuspicious,
} from '../utils/formatters';
import { useUnit } from '../context/UnitContext';

interface TransactionLedgerProps {
  transactions: Transaction[];
  onSelectTx?: (txid: string) => void;
  maxDisplay?: number;
}

export default function TransactionLedger({
  transactions,
  onSelectTx,
  maxDisplay = 200,
}: TransactionLedgerProps) {
  const { convert } = useUnit();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterPattern, setFilterPattern] = useState<string>('all');

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transactions, autoScroll]);

  const displayed = transactions
    .filter((tx) => filterPattern === 'all' || tx.pattern_type === filterPattern)
    .slice(-maxDisplay);

  return (
    <div className="retro-border flex flex-col h-full">
      {/* Header */}
      <div className="border-b-2 border-charcoal px-3 py-2 flex items-center justify-between flex-shrink-0">
        <span className="font-data text-[10px] uppercase tracking-[0.15em]">
          ◆ TRANSACTION LEDGER — {displayed.length} ENTRIES
        </span>
        <div className="flex items-center gap-2">
          <select
            value={filterPattern}
            onChange={(e) => setFilterPattern(e.target.value)}
            className="retro-btn text-[9px] py-0.5 px-2 bg-cream appearance-none cursor-pointer"
          >
            <option value="all">ALL</option>
            <option value="normal">NORMAL</option>
            <option value="peel_chain">PEEL CHAIN</option>
            <option value="coin_burst">COIN BURST</option>
            <option value="mixer">MIXER</option>
          </select>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`retro-btn text-[9px] py-0.5 px-2 ${autoScroll ? 'retro-btn-active' : ''}`}
          >
            {autoScroll ? 'AUTO ●' : 'AUTO ○'}
          </button>
        </div>
      </div>

      {/* Column Headers */}
      <div className="border-b-1 border-charcoal px-3 py-1 flex items-center bg-cream flex-shrink-0">
        <div className="font-data text-[8px] uppercase tracking-[0.12em] opacity-50 grid grid-cols-7 w-full gap-1">
          <span>TIME</span>
          <span>TXID</span>
          <span>FROM</span>
          <span>TO</span>
          <span>AMOUNT</span>
          <span>FEE</span>
          <span>PATTERN</span>
        </div>
      </div>

      {/* Scrollable Body */}
      <div ref={scrollRef} className="overflow-y-auto flex-1" style={{ maxHeight: '500px' }}>
        {displayed.map((tx, i) => {
          const suspicious = isSuspicious(tx.pattern_type);
          return (
            <div
              key={tx.txid + '-' + i}
              onClick={() => onSelectTx?.(tx.txid)}
              className={`px-3 py-1.5 cursor-pointer hover:bg-charcoal hover:text-cream transition-colors border-b border-charcoal ${
                suspicious ? 'bg-red-50' : ''
              }`}
              style={{
                borderLeft: `3px solid ${patternColor(tx.pattern_type)}`,
              }}
            >
              <div className="font-data text-[10px] grid grid-cols-7 w-full gap-1 items-center">
                <span className="opacity-60">{formatTimestamp(tx.timestamp)}</span>
                <span className="font-bold">{truncateHash(tx.txid, 5)}</span>
                <span className="opacity-70">{truncateAddress(tx.source_address, 4)}</span>
                <span className="opacity-70">{truncateAddress(tx.target_address, 4)}</span>
                <span>{convert(tx.amount_sats)}</span>
                <span className="opacity-50">{convert(tx.fee_sats)}</span>
                <span
                  className={`font-bold ${suspicious ? 'danger-pulse' : ''}`}
                  style={{ color: patternColor(tx.pattern_type) }}
                >
                  {patternLabel(tx.pattern_type)}
                  {tx.hop_index > 0 ? ` #${tx.hop_index}` : ''}
                </span>
              </div>
            </div>
          );
        })}
        {displayed.length === 0 && (
          <div className="px-3 py-8 text-center font-data text-xs opacity-40">
            AWAITING TRANSACTION DATA...
          </div>
        )}
      </div>
    </div>
  );
}
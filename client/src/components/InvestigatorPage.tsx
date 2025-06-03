import React, { useState } from 'react';
import KPICards from './KPICards';
import LinkageGraph from './LinkageGraph';
import { Transaction, KPIData } from '../types/transaction';

interface InvestigatorPageProps {
  transactions: Transaction[];
  kpi: KPIData;
  onLoadSample: (data: Transaction[]) => void;
}

const SAMPLE_DATA: Transaction[] = [
  {
    txid: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
    source_address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    target_address: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
    amount_sats: 2500000,
    fee_sats: 1200,
    pattern_type: 'peel_chain',
    hop_index: 0,
    timestamp: Date.now() - 10000,
    parent_txid: null,
    chain_id: 'sample_chain_001',
  },
  {
    txid: 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3',
    source_address: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
    target_address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
    amount_sats: 45000,
    fee_sats: 800,
    pattern_type: 'peel_chain',
    hop_index: 1,
    timestamp: Date.now() - 8000,
    parent_txid: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
    chain_id: 'sample_chain_001',
  },
  {
    txid: 'c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4',
    source_address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
    target_address: '1BoatSLRHtKNngkdXEeobR76b53LETtpyT',
    amount_sats: 38000,
    fee_sats: 650,
    pattern_type: 'peel_chain',
    hop_index: 2,
    timestamp: Date.now() - 6000,
    parent_txid: 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3',
    chain_id: 'sample_chain_001',
  },
  {
    txid: 'd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5',
    source_address: '1dice8EMZmqKvrGE4Qc9bUFf9PX3xaYDp',
    target_address: '3MixerOutputAddr00000000000000001',
    amount_sats: 350000,
    fee_sats: 2000,
    pattern_type: 'mixer',
    hop_index: 0,
    timestamp: Date.now() - 4000,
    parent_txid: null,
    chain_id: 'sample_mixer_001',
  },
  {
    txid: 'e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6',
    source_address: '1AGNa15ZQXAZUgFiqJ2i7Z2DPU2J6hW62i',
    target_address: '3MixerOutputAddr00000000000000001',
    amount_sats: 420000,
    fee_sats: 1800,
    pattern_type: 'mixer',
    hop_index: 1,
    timestamp: Date.now() - 3000,
    parent_txid: null,
    chain_id: 'sample_mixer_001',
  },
];

export default function InvestigatorPage({
  transactions,
  kpi,
  onLoadSample,
}: InvestigatorPageProps) {
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');

  const handlePasteJSON = () => {
    try {
      setJsonError('');
      const parsed = JSON.parse(jsonInput);
      const txs: Transaction[] = Array.isArray(parsed) ? parsed : [parsed];
      onLoadSample(txs);
      setJsonInput('');
    } catch (e) {
      setJsonError('Invalid JSON. Expected array of transaction objects.');
    }
  };

  const handleLoadSample = () => {
    onLoadSample(SAMPLE_DATA);
  };

  return (
    <div className="space-y-0">
      {/* Input Area */}
      <div className="retro-border">
        <div className="border-b-2 border-charcoal px-3 py-1">
          <span className="font-data text-[10px] uppercase tracking-[0.15em]">
            ◆ DATA INPUT
          </span>
        </div>
        <div className="p-3 flex gap-3 items-start">
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='Paste JSON transaction data here... [{"txid": "...", "source_address": "...", ...}]'
            className="flex-1 font-data text-[11px] bg-cream border-2 border-charcoal p-2 resize-none h-16 focus:outline-none focus:border-accent-orange"
          />
          <div className="flex flex-col gap-1">
            <button onClick={handlePasteJSON} className="retro-btn text-[9px]">
              PARSE JSON
            </button>
            <button onClick={handleLoadSample} className="retro-btn text-[9px]">
              LOAD SAMPLE
            </button>
          </div>
        </div>
        {jsonError && (
          <div className="px-3 pb-2 font-data text-[10px] text-accent-red">{jsonError}</div>
        )}
      </div>

      {/* KPIs */}
      <KPICards kpi={kpi} />

      {/* Linkage Graph */}
      <div className="mt-0">
        <LinkageGraph transactions={transactions} />
      </div>
    </div>
  );
}
import { useEffect, useRef, useState, useCallback } from 'react';
import { Transaction, TxBatchMessage, KPIData } from '../types/transaction';

const MAX_TRANSACTIONS = 1500;
const WS_URL = 'ws://localhost:8080';

export function useWebSocket() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [connected, setConnected] = useState(false);
  const [kpi, setKpi] = useState<KPIData>({
    totalVolumeSats: 0,
    highRiskHops: 0,
    totalFeesSats: 0,
    totalTransactions: 0,
    activePeelChains: 0,
    activeMixers: 0,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected to Mempool server');
      setConnected(true);
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const message: TxBatchMessage = JSON.parse(event.data);
        if (message.type === 'tx_batch') {
          setTransactions((prev) => {
            const updated = [...prev, ...message.data];
            if (updated.length > MAX_TRANSACTIONS) {
              return updated.slice(-MAX_TRANSACTIONS);
            }
            return updated;
          });

          setKpi((prev) => {
            const batchVolume = message.data.reduce((s, tx) => s + tx.amount_sats, 0);
            const batchFees = message.data.reduce((s, tx) => s + tx.fee_sats, 0);
            const batchHighRisk = message.data.filter(
              (tx) => tx.pattern_type === 'mixer' || tx.pattern_type === 'peel_chain'
            ).length;
            const peelChains = new Set(
              message.data
                .filter((tx) => tx.pattern_type === 'peel_chain' && tx.chain_id)
                .map((tx) => tx.chain_id)
            ).size;
            const mixers = new Set(
              message.data
                .filter((tx) => tx.pattern_type === 'mixer' && tx.chain_id)
                .map((tx) => tx.chain_id)
            ).size;

            return {
              totalVolumeSats: prev.totalVolumeSats + batchVolume,
              highRiskHops: prev.highRiskHops + batchHighRisk,
              totalFeesSats: prev.totalFeesSats + batchFees,
              totalTransactions: prev.totalTransactions + message.data.length,
              activePeelChains: prev.activePeelChains + peelChains,
              activeMixers: prev.activeMixers + mixers,
            };
          });
        }
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected, retrying in 3s...');
      setConnected(false);
      reconnectTimerRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
      ws.close();
    };
  }, []);

  const loadSampleData = useCallback((data: Transaction[]) => {
    setTransactions((prev) => {
      const updated = [...prev, ...data];
      return updated.slice(-MAX_TRANSACTIONS);
    });

    setKpi((prev) => {
      const batchVolume = data.reduce((s, tx) => s + tx.amount_sats, 0);
      const batchFees = data.reduce((s, tx) => s + tx.fee_sats, 0);
      const batchHighRisk = data.filter(
        (tx) => tx.pattern_type === 'mixer' || tx.pattern_type === 'peel_chain'
      ).length;

      return {
        totalVolumeSats: prev.totalVolumeSats + batchVolume,
        highRiskHops: prev.highRiskHops + batchHighRisk,
        totalFeesSats: prev.totalFeesSats + batchFees,
        totalTransactions: prev.totalTransactions + data.length,
        activePeelChains: prev.activePeelChains,
        activeMixers: prev.activeMixers,
      };
    });
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { transactions, connected, kpi, loadSampleData };
}
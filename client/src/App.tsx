import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { UnitProvider } from './context/UnitContext';
import { useWebSocket } from './hooks/useWebSocket';
import TopBar from './components/TopBar';
import InvestigatorPage from './components/InvestigatorPage';
import LedgerPage from './components/LedgerPage';
import AlertsPage from './components/AlertsPage';

export default function App() {
  const { transactions, connected, kpi, loadSampleData } = useWebSocket();

  return (
    <UnitProvider>
      <div className="min-h-screen bg-cream flex flex-col">
        <TopBar connected={connected} />

        <main className="flex-1 p-4">
          <Routes>
            <Route
              path="/"
              element={
                <InvestigatorPage
                  transactions={transactions}
                  kpi={kpi}
                  onLoadSample={loadSampleData}
                />
              }
            />
            <Route
              path="/ledger"
              element={<LedgerPage transactions={transactions} />}
            />
            <Route
              path="/alerts"
              element={<AlertsPage transactions={transactions} />}
            />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="border-t-2 border-charcoal px-4 py-2 flex items-center justify-between">
          <span className="font-data text-[8px] uppercase tracking-[0.2em] opacity-40">
            BTC_FORENSICS v1.0.0 — SIMULATION ONLY
          </span>
          <span className="font-data text-[8px] uppercase tracking-[0.2em] opacity-40">
            {transactions.length} TXS IN MEMORY
          </span>
        </footer>
      </div>
    </UnitProvider>
  );
}
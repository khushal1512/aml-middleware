import React from 'react';
import TransactionLedger from './TransactionLedger';
import { Transaction } from '../types/transaction';

interface LedgerPageProps {
  transactions: Transaction[];
}

export default function LedgerPage({ transactions }: LedgerPageProps) {
  return (
    <div className="h-[calc(100vh-60px)]">
      <TransactionLedger transactions={transactions} maxDisplay={500} />
    </div>
  );
}
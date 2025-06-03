import React from 'react';
import AlertsPanel from './AlertsPanel';
import { Transaction } from '../types/transaction';

interface AlertsPageProps {
  transactions: Transaction[];
}

export default function AlertsPage({ transactions }: AlertsPageProps) {
  return (
    <div className="h-[calc(100vh-60px)]">
      <AlertsPanel transactions={transactions} />
    </div>
  );
}
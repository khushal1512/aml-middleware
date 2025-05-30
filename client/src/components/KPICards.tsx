import React from 'react';
import { KPIData } from '../types/transaction';
import { useUnit } from '../context/UnitContext';

interface KPICardsProps {
  kpi: KPIData;
}

export default function KPICards({ kpi }: KPICardsProps) {
  const { convert } = useUnit();

  const cards = [
    {
      label: 'TOTAL VOLUME',
      value: convert(kpi.totalVolumeSats),
      color: 'border-charcoal',
    },
    {
      label: 'HIGH RISK HOPS',
      value: kpi.highRiskHops.toString(),
      color: 'border-accent-red',
    },
    {
      label: 'TOTAL FEES',
      value: convert(kpi.totalFeesSats),
      color: 'border-accent-mustard',
    },
    {
      label: 'TRANSACTIONS',
      value: kpi.totalTransactions.toString(),
      color: 'border-charcoal',
    },
    {
      label: 'PEEL CHAINS',
      value: kpi.activePeelChains.toString(),
      color: 'border-accent-mustard',
    },
    {
      label: 'MIXERS DETECTED',
      value: kpi.activeMixers.toString(),
      color: 'border-accent-red',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-0">
      {cards.map((card, i) => (
        <div
          key={i}
          className={`border-2 ${card.color} p-3 ${i > 0 ? 'border-l-0' : ''} ${
            i >= 3 ? 'border-t-0 lg:border-t-2' : ''
          } lg:border-l-0 lg:first:border-l-2`}
          style={{ borderLeftWidth: i === 0 ? '2px' : undefined }}
        >
          <div className="font-data text-[9px] uppercase tracking-[0.15em] opacity-60 mb-1">
            {card.label}
          </div>
          <div className="font-data text-sm font-bold truncate">{card.value}</div>
        </div>
      ))}
    </div>
  );
}
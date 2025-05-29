import React from 'react';
import { NavLink } from 'react-router-dom';
import { useUnit } from '../context/UnitContext';

interface TopBarProps {
  connected: boolean;
}

export default function TopBar({ connected }: TopBarProps) {
  const { unit, toggleUnit } = useUnit();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `retro-btn text-xs ${isActive ? 'retro-btn-active' : ''}`;

  return (
    <header className="border-b-2 border-charcoal bg-cream sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <h1 className="font-logo text-xs leading-none tracking-tight">
            BTC<span className="text-accent-orange">_</span>FORENSICS
          </h1>
          <div
            className={`w-2 h-2 ${connected ? 'bg-accent-teal' : 'bg-accent-red'}`}
            title={connected ? 'Connected' : 'Disconnected'}
          />
          <span className="font-data text-[10px] uppercase tracking-widest opacity-60">
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-2">
          <NavLink to="/" className={navLinkClass}>
            Investigator
          </NavLink>
          <NavLink to="/ledger" className={navLinkClass}>
            Ledger
          </NavLink>
          <NavLink to="/alerts" className={navLinkClass}>
            Alerts
          </NavLink>

          <div className="w-px h-6 bg-charcoal mx-2" />

          {/* SAT/BTC Toggle */}
          <button
            onClick={toggleUnit}
            className="retro-btn text-xs flex items-center gap-1"
          >
            <span className={unit === 'SAT' ? 'text-accent-orange' : 'opacity-40'}>
              SAT
            </span>
            <span>/</span>
            <span className={unit === 'BTC' ? 'text-accent-orange' : 'opacity-40'}>
              BTC
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
}
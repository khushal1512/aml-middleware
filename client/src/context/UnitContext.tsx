import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type Unit = 'SAT' | 'BTC';

interface UnitContextType {
  unit: Unit;
  toggleUnit: () => void;
  convert: (sats: number) => string;
  label: string;
}

const UnitContext = createContext<UnitContextType | undefined>(undefined);

export function UnitProvider({ children }: { children: ReactNode }) {
  const [unit, setUnit] = useState<Unit>('SAT');

  const toggleUnit = useCallback(() => {
    setUnit((prev) => (prev === 'SAT' ? 'BTC' : 'SAT'));
  }, []);

  const convert = useCallback(
    (sats: number): string => {
      if (unit === 'SAT') {
        return sats.toLocaleString() + ' sat';
      }
      const btc = sats / 100_000_000;
      return btc.toFixed(8) + ' BTC';
    },
    [unit]
  );

  const label = unit === 'SAT' ? 'SAT' : 'BTC';

  return (
    <UnitContext.Provider value={{ unit, toggleUnit, convert, label }}>
      {children}
    </UnitContext.Provider>
  );
}

export function useUnit(): UnitContextType {
  const context = useContext(UnitContext);
  if (!context) {
    throw new Error('useUnit must be used within a UnitProvider');
  }
  return context;
}
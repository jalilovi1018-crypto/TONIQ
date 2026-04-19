import { createContext, useContext, useState } from 'react';

interface CurrencyContextType {
  currency: 'USD' | 'EUR';
  setCurrency: (c: 'USD' | 'EUR') => void;
}

export const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'USD',
  setCurrency: () => {},
});

export function useCurrency() {
  return useContext(CurrencyContext);
}

/** Format a USD amount into the user's preferred currency. */
export function formatPrice(usd: number, currency: string): string {
  if (currency === 'EUR') {
    return '€' + (usd * 0.92).toFixed(2);
  }
  return '$' + usd.toFixed(2);
}

/**
 * Format a token price — like formatPrice but uses 6 decimal places
 * for sub-cent values (needed for small-cap tokens).
 */
export function formatTokenPrice(usd: number, currency: string): string {
  const rate = currency === 'EUR' ? 0.92 : 1;
  const sym  = currency === 'EUR' ? '€' : '$';
  const v    = usd * rate;
  if (!Number.isFinite(v)) return `${sym}—`;
  return v < 0.01 ? `${sym}${v.toFixed(6)}` : `${sym}${v.toFixed(2)}`;
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<'USD' | 'EUR'>(
    () => (localStorage.getItem('toniq_currency') as 'USD' | 'EUR') || 'USD'
  );

  const setCurrency = (c: 'USD' | 'EUR') => {
    setCurrencyState(c);
    localStorage.setItem('toniq_currency', c);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

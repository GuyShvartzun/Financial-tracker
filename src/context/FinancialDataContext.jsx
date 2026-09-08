import React, { createContext, useContext } from 'react';

export const FinancialDataContext = createContext(null);

export function FinancialDataProvider({ value, children }) {
  return (
    <FinancialDataContext.Provider value={value}>
      {children}
    </FinancialDataContext.Provider>
  );
}

export function useFinancialData() {
  const context = useContext(FinancialDataContext);
  if (!context) {
    return {};
  }
  return context;
}

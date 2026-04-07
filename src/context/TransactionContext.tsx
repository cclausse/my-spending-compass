import React, { createContext, useContext, useState, useCallback } from 'react';
import { Transaction } from '@/types/transaction';

interface TransactionState {
  transactions: Transaction[];
  addTransactions: (txns: Transaction[]) => void;
  clearTransactions: () => void;
}

const TransactionContext = createContext<TransactionState | null>(null);

export function TransactionProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const addTransactions = useCallback((txns: Transaction[]) => {
    setTransactions(prev => {
      const existingIds = new Set(prev.map(t => `${t.date.getTime()}-${t.description}-${t.amount}`));
      const newTxns = txns.filter(t => !existingIds.has(`${t.date.getTime()}-${t.description}-${t.amount}`));
      return [...prev, ...newTxns].sort((a, b) => b.date.getTime() - a.date.getTime());
    });
  }, []);

  const clearTransactions = useCallback(() => setTransactions([]), []);

  return (
    <TransactionContext.Provider value={{ transactions, addTransactions, clearTransactions }}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const ctx = useContext(TransactionContext);
  if (!ctx) throw new Error('useTransactions must be used within TransactionProvider');
  return ctx;
}

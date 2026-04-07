import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Transaction } from '@/types/transaction';
import { detectFormat, parseBankCSV, parseAmexCSV } from '@/lib/parsers';

interface TransactionState {
  transactions: Transaction[];
  addTransactions: (txns: Transaction[]) => void;
  clearTransactions: () => void;
  storeFiles: (files: File[]) => void;
  refreshFiles: () => Promise<void>;
  storedFileCount: number;
}

const TransactionContext = createContext<TransactionState | null>(null);

export function TransactionProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const storedFilesRef = useRef<File[]>([]);
  const [storedFileCount, setStoredFileCount] = useState(0);

  const addTransactions = useCallback((txns: Transaction[]) => {
    setTransactions(prev => {
      const existingIds = new Set(prev.map(t => `${t.date.getTime()}-${t.description}-${t.amount}`));
      const newTxns = txns.filter(t => !existingIds.has(`${t.date.getTime()}-${t.description}-${t.amount}`));
      return [...prev, ...newTxns].sort((a, b) => b.date.getTime() - a.date.getTime());
    });
  }, []);

  const clearTransactions = useCallback(() => setTransactions([]), []);

  const storeFiles = useCallback((files: File[]) => {
    const existingNames = new Set(storedFilesRef.current.map(f => f.name));
    const newFiles = files.filter(f => !existingNames.has(f.name));
    storedFilesRef.current = [...storedFilesRef.current, ...newFiles];
    setStoredFileCount(storedFilesRef.current.length);
  }, []);

  const refreshFiles = useCallback(async () => {
    const allTxns: Transaction[] = [];
    for (const file of storedFilesRef.current) {
      try {
        const content = await file.text();
        const format = detectFormat(content, file.name);
        if (!format) continue;
        let txns: Transaction[] = [];
        if (format === 'bank') txns = parseBankCSV(content);
        else if (format === 'amex') txns = parseAmexCSV(content);
        allTxns.push(...txns);
      } catch {
        // skip unreadable files
      }
    }
    // Replace all transactions with fresh parse
    const deduped = new Map<string, Transaction>();
    for (const t of allTxns) {
      const key = `${t.date.getTime()}-${t.description}-${t.amount}`;
      if (!deduped.has(key)) deduped.set(key, t);
    }
    setTransactions(Array.from(deduped.values()).sort((a, b) => b.date.getTime() - a.date.getTime()));
  }, []);

  return (
    <TransactionContext.Provider value={{ transactions, addTransactions, clearTransactions, storeFiles, refreshFiles, storedFileCount }}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const ctx = useContext(TransactionContext);
  if (!ctx) throw new Error('useTransactions must be used within TransactionProvider');
  return ctx;
}

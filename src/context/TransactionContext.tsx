import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Transaction, Category } from '@/types/transaction';
import { supabase } from '@/integrations/supabase/client';

interface TransactionState {
  transactions: Transaction[];
  loading: boolean;
  refreshTransactions: () => Promise<void>;
  clearTransactions: () => void;
}

const TransactionContext = createContext<TransactionState | null>(null);

export function TransactionProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all transactions for the logged-in user (RLS handles filtering)
      // Supabase default limit is 1000, paginate if needed
      let allRows: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('transactions')
          .select('*, imports!inner(source_type)')
          .order('booking_date', { ascending: false })
          .range(from, from + pageSize - 1);

        if (error) {
          console.error('Error fetching transactions:', error);
          break;
        }

        allRows = allRows.concat(data || []);
        hasMore = (data?.length || 0) === pageSize;
        from += pageSize;
      }

      const SOURCE_LABELS: Record<string, string> = {
        bank: 'Regningskonto',
        amex: 'AMEX',
        sasmc: 'SAS MC',
        banknorwegian: 'Bank Norwegian',
      };

      const mapped: Transaction[] = allRows.map(row => ({
        id: row.id,
        date: new Date(row.booking_date),
        description: row.description_raw,
        amount: Number(row.amount),
        category: (row.category || 'annet') as Category,
        source: (row.imports?.source_type || 'bank') as Transaction['source'],
        sourceLabel: SOURCE_LABELS[row.imports?.source_type || 'bank'] || row.imports?.source_type || 'Ukjent',
        cardHolder: row.card_holder || undefined,
      }));

      setTransactions(mapped);
    } catch (e) {
      console.error('Failed to fetch transactions:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const clearTransactions = useCallback(() => setTransactions([]), []);

  return (
    <TransactionContext.Provider value={{ transactions, loading, refreshTransactions: fetchTransactions, clearTransactions }}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const ctx = useContext(TransactionContext);
  if (!ctx) throw new Error('useTransactions must be used within TransactionProvider');
  return ctx;
}

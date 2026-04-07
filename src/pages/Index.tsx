import { FileUpload } from '@/components/FileUpload';
import { Dashboard } from '@/components/Dashboard';
import { TransactionProvider, useTransactions } from '@/context/TransactionContext';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

function PageContent() {
  const { transactions, clearTransactions } = useTransactions();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Økonomi&shy;oversikt</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Analyser og kategoriser ditt forbruk</p>
          </div>
          {transactions.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearTransactions} className="text-muted-foreground">
              <Trash2 className="h-4 w-4 mr-1" /> Nullstill
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto py-6 px-4 space-y-6">
        <FileUpload />
        <Dashboard />
      </main>
    </div>
  );
}

const Index = () => (
  <TransactionProvider>
    <PageContent />
  </TransactionProvider>
);

export default Index;

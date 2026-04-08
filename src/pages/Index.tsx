import { Dashboard } from '@/components/Dashboard';
import { TransactionProvider } from '@/context/TransactionContext';
import { NavLink } from '@/components/NavLink';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

function PageContent() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Økonomi&shy;oversikt</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Analyser og kategoriser ditt forbruk</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/import')} className="gap-2">
            <Upload className="h-4 w-4" /> Import
          </Button>
        </div>
      </header>

      <main className="container mx-auto py-6 px-4 space-y-6">
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

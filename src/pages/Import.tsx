import { useState } from 'react';
import { CloudFileUpload } from '@/components/CloudFileUpload';
import { ImportHistory } from '@/components/ImportHistory';

export default function ImportPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto py-4 px-4">
          <h1 className="text-xl font-bold tracking-tight">Import</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Last opp og prosesser bankfiler</p>
        </div>
      </header>

      <main className="container mx-auto py-6 px-4 space-y-6">
        <CloudFileUpload onImportComplete={() => setRefreshTrigger(n => n + 1)} />
        <ImportHistory refreshTrigger={refreshTrigger} />
      </main>
    </div>
  );
}

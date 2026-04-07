import { useCallback, useState } from 'react';
import { Upload, FileText, Check, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTransactions } from '@/context/TransactionContext';
import { detectFormat, parseBankCSV, parseAmexCSV } from '@/lib/parsers';
import { useToast } from '@/hooks/use-toast';

interface FileResult {
  name: string;
  count: number;
  source: string;
  status: 'success' | 'error';
  message?: string;
}

export function FileUpload() {
  const { addTransactions, storeFiles } = useTransactions();
  const { toast } = useToast();
  const [results, setResults] = useState<FileResult[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback(async (file: File) => {
    try {
      const content = await file.text();
      const format = detectFormat(content, file.name);

      if (!format) {
        return { name: file.name, count: 0, source: 'ukjent', status: 'error' as const, message: 'Ukjent filformat' };
      }

      let txns;
      if (format === 'bank') txns = parseBankCSV(content);
      else if (format === 'amex') txns = parseAmexCSV(content);
      else return { name: file.name, count: 0, source: 'ukjent', status: 'error' as const, message: 'Format ikke støttet ennå' };

      addTransactions(txns);
      return { name: file.name, count: txns.length, source: format === 'bank' ? 'Regningskonto' : 'AMEX', status: 'success' as const };
    } catch (e) {
      return { name: file.name, count: 0, source: 'ukjent', status: 'error' as const, message: 'Kunne ikke lese filen' };
    }
  }, [addTransactions]);

  const handleFiles = useCallback(async (files: FileList) => {
    const fileResults: FileResult[] = [];
    for (const file of Array.from(files)) {
      const result = await processFile(file);
      fileResults.push(result);
    }
    setResults(prev => [...fileResults, ...prev]);

    const total = fileResults.reduce((s, r) => s + r.count, 0);
    if (total > 0) {
      toast({ title: `${total} transaksjoner importert`, description: `Fra ${fileResults.filter(r => r.status === 'success').length} fil(er)` });
    }
  }, [processFile, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Upload className="h-5 w-5" />
          Last opp transaksjoner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer
            ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
        >
          <Upload className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">Dra og slipp filer her</p>
          <p className="text-xs text-muted-foreground mt-1">CSV (Regningskonto, AMEX)</p>
          <input
            type="file"
            accept=".csv"
            multiple
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={e => e.target.files && handleFiles(e.target.files)}
          />
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md border p-3 text-sm">
                {r.status === 'success' ? (
                  <Check className="h-4 w-4 text-green-600 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                )}
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">{r.name}</span>
                <span className="text-muted-foreground ml-auto whitespace-nowrap">
                  {r.status === 'success' ? `${r.count} txn · ${r.source}` : r.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useState, useCallback } from 'react';
import { Upload, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UploadResult {
  name: string;
  status: 'uploading' | 'processing' | 'success' | 'error';
  message?: string;
  txnCount?: number;
}

export function CloudFileUpload({ onImportComplete }: { onImportComplete?: () => void }) {
  const { toast } = useToast();
  const [results, setResults] = useState<UploadResult[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const updateResult = (index: number, update: Partial<UploadResult>) => {
    setResults(prev => prev.map((r, i) => i === index ? { ...r, ...update } : r));
  };

  const processFile = useCallback(async (file: File, index: number) => {
    // Validate file type
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!['.csv', '.xlsx', '.xls'].includes(ext)) {
      updateResult(index, { status: 'error', message: 'Ugyldig filtype. Kun CSV og Excel støttes.' });
      return;
    }

    // Validate size (20MB)
    if (file.size > 20 * 1024 * 1024) {
      updateResult(index, { status: 'error', message: 'Filen er for stor (maks 20MB).' });
      return;
    }

    try {
      // 1. Get presigned upload URL
      updateResult(index, { status: 'uploading', message: 'Henter opplastings-URL...' });

      const { data: urlData, error: urlError } = await supabase.functions.invoke('get-upload-url', {
        body: { fileName: file.name, fileSize: file.size, fileType: ext },
      });

      if (urlError || !urlData?.uploadUrl) {
        updateResult(index, { status: 'error', message: urlData?.error || 'Kunne ikke hente opplastings-URL' });
        return;
      }

      // 2. Upload to S3
      updateResult(index, { status: 'uploading', message: 'Laster opp fil...' });

      const uploadResponse = await fetch(urlData.uploadUrl, {
        method: 'PUT',
        body: file,
      });

      if (!uploadResponse.ok) {
        updateResult(index, { status: 'error', message: 'Opplasting til S3 feilet' });
        return;
      }

      // 3. Process import (server-side parsing)
      updateResult(index, { status: 'processing', message: 'Prosesserer transaksjoner...' });

      const { data: processData, error: processError } = await supabase.functions.invoke('process-import', {
        body: { importId: urlData.importId },
      });

      if (processError || processData?.error) {
        updateResult(index, { status: 'error', message: processData?.error || 'Parsing feilet' });
        return;
      }

      updateResult(index, {
        status: 'success',
        txnCount: processData.insertedCount,
        message: processData.duplicatesSkipped > 0
          ? `${processData.insertedCount} nye, ${processData.duplicatesSkipped} duplikater hoppet over`
          : `${processData.insertedCount} transaksjoner importert`,
      });

      onImportComplete?.();
    } catch (e) {
      updateResult(index, { status: 'error', message: 'En uventet feil oppstod' });
    }
  }, [onImportComplete, toast]);

  const handleFiles = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);
    const startIndex = results.length;

    // Add all files as pending
    setResults(prev => [
      ...fileArray.map(f => ({ name: f.name, status: 'uploading' as const })),
      ...prev,
    ]);

    // Process sequentially to avoid overwhelming
    for (let i = 0; i < fileArray.length; i++) {
      await processFile(fileArray[i], i);
    }

    const successCount = fileArray.length; // approximate
    if (successCount > 0) {
      toast({ title: 'Import fullført', description: `${fileArray.length} fil(er) behandlet` });
    }
  }, [processFile, results.length, toast]);

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
          Last opp bankfiler
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
          <p className="text-xs text-muted-foreground mt-1">CSV eller Excel (maks 20MB)</p>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
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
                ) : r.status === 'error' ? (
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                ) : (
                  <Loader2 className="h-4 w-4 text-muted-foreground animate-spin shrink-0" />
                )}
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">{r.name}</span>
                <span className="text-muted-foreground ml-auto whitespace-nowrap text-xs">
                  {r.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

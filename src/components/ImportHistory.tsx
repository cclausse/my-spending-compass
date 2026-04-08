import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

interface ImportRecord {
  id: string;
  file_name: string;
  file_size: number;
  source_type: string | null;
  status: string;
  error_message: string | null;
  transaction_count: number | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  uploaded: { label: 'Lastet opp', variant: 'outline' },
  processing: { label: 'Prosesserer', variant: 'secondary' },
  parsed: { label: 'Fullført', variant: 'default' },
  failed: { label: 'Feilet', variant: 'destructive' },
};

const sourceLabels: Record<string, string> = {
  bank: 'Regningskonto',
  amex: 'AMEX',
  sasmc: 'SAS MC',
  banknorwegian: 'Bank Norwegian',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImportHistory({ refreshTrigger }: { refreshTrigger?: number }) {
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchImports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('imports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setImports(data as ImportRecord[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchImports();
  }, [refreshTrigger]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Importhistorikk
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={fetchImports} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {imports.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Ingen importer ennå. Last opp bankfiler for å komme i gang.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filnavn</TableHead>
                <TableHead>Kilde</TableHead>
                <TableHead>Størrelse</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Transaksjoner</TableHead>
                <TableHead>Tidspunkt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {imports.map((imp) => {
                const sc = statusConfig[imp.status] || statusConfig.uploaded;
                return (
                  <TableRow key={imp.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{imp.file_name}</TableCell>
                    <TableCell>{imp.source_type ? sourceLabels[imp.source_type] || imp.source_type : '—'}</TableCell>
                    <TableCell>{formatBytes(imp.file_size)}</TableCell>
                    <TableCell>
                      <Badge variant={sc.variant}>{sc.label}</Badge>
                      {imp.status === 'failed' && imp.error_message && (
                        <p className="text-xs text-destructive mt-1 max-w-[200px] truncate" title={imp.error_message}>
                          {imp.error_message}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{imp.transaction_count ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {format(new Date(imp.created_at), 'dd. MMM yyyy HH:mm', { locale: nb })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

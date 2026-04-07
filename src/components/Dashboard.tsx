import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTransactions } from '@/context/TransactionContext';
import { CATEGORY_LABELS, CATEGORY_COLORS, Category } from '@/types/transaction';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingDown, TrendingUp, Wallet, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

function StatCard({ title, value, icon: Icon, className }: { title: string; value: string; icon: React.ElementType; className?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${className}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-xl font-bold tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const formatNOK = (n: number) => new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 }).format(n);

export function Dashboard() {
  const { transactions } = useTransactions();
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const months = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => set.add(format(t.date, 'yyyy-MM')));
    return Array.from(set).sort().reverse();
  }, [transactions]);

  const filtered = useMemo(() => {
    if (monthFilter === 'all') return transactions;
    return transactions.filter(t => format(t.date, 'yyyy-MM') === monthFilter);
  }, [transactions, monthFilter]);

  const expenses = useMemo(() => filtered.filter(t => t.amount < 0), [filtered]);
  const income = useMemo(() => filtered.filter(t => t.amount > 0), [filtered]);

  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);
  const totalIncome = income.reduce((s, t) => s + t.amount, 0);

  const categoryData = useMemo(() => {
    const map = new Map<Category, number>();
    expenses.forEach(t => map.set(t.category, (map.get(t.category) || 0) + Math.abs(t.amount)));
    return Array.from(map.entries())
      .map(([cat, value]) => ({ name: CATEGORY_LABELS[cat], value, color: CATEGORY_COLORS[cat], category: cat }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string; expenses: number; income: number }>();
    transactions.forEach(t => {
      const m = format(t.date, 'MMM yy', { locale: nb });
      const key = format(t.date, 'yyyy-MM');
      if (!map.has(key)) map.set(key, { month: m, expenses: 0, income: 0 });
      const entry = map.get(key)!;
      if (t.amount < 0) entry.expenses += Math.abs(t.amount);
      else entry.income += t.amount;
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Wallet className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Ingen transaksjoner ennå</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Last opp en CSV-fil for å komme i gang</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Velg måned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle måneder</SelectItem>
            {months.map(m => (
              <SelectItem key={m} value={m}>
                {format(new Date(m + '-01'), 'MMMM yyyy', { locale: nb })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Totalt forbruk" value={formatNOK(Math.abs(totalExpenses))} icon={TrendingDown} className="bg-destructive/10 text-destructive" />
        <StatCard title="Inntekter" value={formatNOK(totalIncome)} icon={TrendingUp} className="bg-green-100 text-green-700" />
        <StatCard title="Netto" value={formatNOK(totalIncome + totalExpenses)} icon={ArrowUpDown} className="bg-primary/10 text-primary" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Forbruk per kategori</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={2}>
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatNOK(val)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              {categoryData.map(c => (
                <div key={c.category} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-muted-foreground">{c.name}</span>
                  <span className="font-medium">{formatNOK(c.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Månedlig oversikt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${Math.round(v / 1000)}k`} className="text-muted-foreground" />
                  <Tooltip formatter={(val: number) => formatNOK(val)} />
                  <Bar dataKey="expenses" name="Forbruk" fill="hsl(0, 65%, 55%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="income" name="Inntekt" fill="hsl(142, 60%, 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaksjoner ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Dato</th>
                  <th className="pb-2 font-medium">Beskrivelse</th>
                  <th className="pb-2 font-medium">Kategori</th>
                  <th className="pb-2 font-medium">Kilde</th>
                  <th className="pb-2 font-medium text-right">Beløp</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-2 text-muted-foreground">{format(t.date, 'dd.MM.yy')}</td>
                    <td className="py-2 max-w-48 truncate">{t.description}</td>
                    <td className="py-2">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[t.category] }} />
                        {CATEGORY_LABELS[t.category]}
                      </span>
                    </td>
                    <td className="py-2 text-muted-foreground text-xs">{t.sourceLabel}</td>
                    <td className={`py-2 text-right font-mono tabular-nums ${t.amount < 0 ? 'text-destructive' : 'text-green-600'}`}>
                      {formatNOK(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

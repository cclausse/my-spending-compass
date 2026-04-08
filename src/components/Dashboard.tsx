import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTransactions } from '@/context/TransactionContext';
import { CATEGORY_LABELS, CATEGORY_COLORS, Category } from '@/types/transaction';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TrendingDown, TrendingUp, Wallet, ArrowUpDown, Filter, Search, Calendar, CreditCard, RefreshCw, User } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

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

function toggleInSet<T>(prev: Set<T>, item: T): Set<T> {
  const next = new Set(prev);
  if (next.has(item)) next.delete(item); else next.add(item);
  return next;
}

export function Dashboard() {
  const { transactions, loading, refreshTransactions, updateCategory } = useTransactions();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [monthFilter, setMonthFilter] = useState<Set<string>>(new Set());
  const [sourceFilter, setSourceFilter] = useState<Set<string>>(new Set());
  const [cardHolderFilter, setCardHolderFilter] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<Set<Category>>(new Set());
  const [descriptionFilter, setDescriptionFilter] = useState<Set<string>>(new Set());
  const initialized = useRef(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshTransactions();
      toast({ title: 'Oppdatert', description: 'Transaksjoner hentet fra databasen' });
    } catch {
      toast({ title: 'Feil', description: 'Kunne ikke hente transaksjoner', variant: 'destructive' });
    } finally {
      setIsRefreshing(false);
    }
  };

  // All available months & sources (global)
  const allMonths = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => set.add(format(t.date, 'yyyy-MM')));
    return Array.from(set).sort().reverse();
  }, [transactions]);

  const allSources = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => set.add(t.sourceLabel));
    return Array.from(set).sort();
  }, [transactions]);

  const allCardHolders = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => { if (t.cardHolder) set.add(t.cardHolder); });
    return Array.from(set).sort();
  }, [transactions]);

  // Initialize all filters to "all selected" on first data load
  useEffect(() => {
    if (transactions.length > 0 && !initialized.current) {
      initialized.current = true;
      setMonthFilter(new Set(allMonths));
      setSourceFilter(new Set(allSources));
      setCardHolderFilter(new Set(allCardHolders));
    }
  }, [transactions, allMonths, allSources, allCardHolders]);

  // Step 1: filter by period + source
  const afterPeriodAndSource = useMemo(() => {
    let result = transactions;
    if (monthFilter.size > 0) result = result.filter(t => monthFilter.has(format(t.date, 'yyyy-MM')));
    if (sourceFilter.size > 0) result = result.filter(t => sourceFilter.has(t.sourceLabel));
    if (cardHolderFilter.size > 0) result = result.filter(t => !t.cardHolder || cardHolderFilter.has(t.cardHolder));
    return result;
  }, [transactions, monthFilter, sourceFilter, cardHolderFilter]);

  // Available categories based on period+source selection
  const availableCategories = useMemo(() => {
    const set = new Set<Category>();
    afterPeriodAndSource.forEach(t => set.add(t.category));
    return Array.from(set).sort((a, b) => CATEGORY_LABELS[a].localeCompare(CATEGORY_LABELS[b]));
  }, [afterPeriodAndSource]);

  // Auto-select all categories when available categories change and filter is empty
  useEffect(() => {
    if (availableCategories.length > 0 && categoryFilter.size === 0) {
      setCategoryFilter(new Set(availableCategories));
    }
  }, [availableCategories]);

  // Step 2: filter by category
  const afterCategory = useMemo(() => {
    if (categoryFilter.size === 0) return afterPeriodAndSource;
    return afterPeriodAndSource.filter(t => categoryFilter.has(t.category));
  }, [afterPeriodAndSource, categoryFilter]);

  // Available descriptions based on period+source+category
  const availableDescriptions = useMemo(() => {
    const set = new Set<string>();
    afterCategory.forEach(t => set.add(t.description));
    return Array.from(set).sort();
  }, [afterCategory]);

  // Step 3: final filtered result
  const filtered = useMemo(() => {
    let result = afterCategory;
    if (descriptionFilter.size > 0) result = result.filter(t => descriptionFilter.has(t.description));
    return result;
  }, [afterCategory, descriptionFilter]);

  // Clean up stale selections when available options change
  // (category filter can only contain available categories)
  useMemo(() => {
    if (categoryFilter.size > 0) {
      const valid = new Set(availableCategories);
      const cleaned = new Set([...categoryFilter].filter(c => valid.has(c)));
      if (cleaned.size !== categoryFilter.size) setCategoryFilter(cleaned);
    }
  }, [availableCategories]);

  useMemo(() => {
    if (descriptionFilter.size > 0) {
      const valid = new Set(availableDescriptions);
      const cleaned = new Set([...descriptionFilter].filter(d => valid.has(d)));
      if (cleaned.size !== descriptionFilter.size) setDescriptionFilter(cleaned);
    }
  }, [availableDescriptions]);

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
    filtered.forEach(t => {
      const m = format(t.date, 'MMM yy', { locale: nb });
      const key = format(t.date, 'yyyy-MM');
      if (!map.has(key)) map.set(key, { month: m, expenses: 0, income: 0 });
      const entry = map.get(key)!;
      if (t.amount < 0) entry.expenses += Math.abs(t.amount);
      else entry.income += t.amount;
    });
    return Array.from(map.entries()).sort(([a], [b]) => (a ?? '').localeCompare(b ?? '')).map(([, v]) => v);
  }, [filtered]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Wallet className="h-12 w-12 text-muted-foreground/40 mb-4 animate-pulse" />
          <p className="text-lg font-medium text-muted-foreground">Laster transaksjoner…</p>
        </CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Wallet className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Ingen transaksjoner ennå</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Gå til Import-siden for å laste opp bankfiler</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Period multi-select */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-48 justify-start gap-2">
              <Calendar className="h-4 w-4" />
              {monthFilter.size === 0 ? 'Alle perioder' : `${monthFilter.size} perioder`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 max-h-72 overflow-y-auto p-3" align="start">
            <div className="space-y-2">
              <div className="flex gap-2">
                <button className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => setMonthFilter(new Set(allMonths))}>Alle</button>
                <button className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => setMonthFilter(new Set())}>Nullstill</button>
              </div>
              {allMonths.map(m => (
                <label key={m} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox checked={monthFilter.has(m)} onCheckedChange={() => setMonthFilter(prev => toggleInSet(prev, m))} />
                  {format(new Date(m + '-01'), 'MMMM yyyy', { locale: nb })}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Source multi-select */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-48 justify-start gap-2">
              <CreditCard className="h-4 w-4" />
              {sourceFilter.size === 0 ? 'Alle kontoer' : `${sourceFilter.size} kontoer`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 max-h-72 overflow-y-auto p-3" align="start">
            <div className="space-y-2">
              <div className="flex gap-2">
                <button className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => setSourceFilter(new Set(allSources))}>Alle</button>
                <button className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => setSourceFilter(new Set())}>Nullstill</button>
              </div>
              {allSources.map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox checked={sourceFilter.has(s)} onCheckedChange={() => setSourceFilter(prev => toggleInSet(prev, s))} />
                  {s}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Category multi-select (cascaded from period+source) */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-48 justify-start gap-2">
              <Filter className="h-4 w-4" />
              {categoryFilter.size === 0 ? 'Ingen kategorier' : `${categoryFilter.size} kategorier`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 max-h-72 overflow-y-auto p-3" align="start">
            <div className="space-y-2">
              <div className="flex gap-2">
                <button className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => setCategoryFilter(new Set(availableCategories))}>Alle</button>
                <button className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => setCategoryFilter(new Set())}>Nullstill</button>
              </div>
              {availableCategories.map(cat => (
                <label key={cat} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox checked={categoryFilter.has(cat)} onCheckedChange={() => setCategoryFilter(prev => toggleInSet(prev, cat))} />
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                  {CATEGORY_LABELS[cat]}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Description multi-select (cascaded from period+source+category) */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-48 justify-start gap-2">
              <Search className="h-4 w-4" />
              {descriptionFilter.size === 0 ? 'Alle beskrivelser' : `${descriptionFilter.size} valgt`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 max-h-80 overflow-y-auto p-3" align="start">
            <div className="space-y-2">
              <div className="flex gap-2">
                <button className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => setDescriptionFilter(new Set(availableDescriptions))}>Alle</button>
                <button className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => setDescriptionFilter(new Set())}>Nullstill</button>
              </div>
              {availableDescriptions.map(desc => (
                <label key={desc} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox checked={descriptionFilter.has(desc)} onCheckedChange={() => setDescriptionFilter(prev => toggleInSet(prev, desc))} />
                  <span className="truncate max-w-52">{desc}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Card holder multi-select */}
        {allCardHolders.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-48 justify-start gap-2">
                <User className="h-4 w-4" />
                {cardHolderFilter.size === 0 ? 'Alle brukere' : `${cardHolderFilter.size} brukere`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 max-h-72 overflow-y-auto p-3" align="start">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => setCardHolderFilter(new Set(allCardHolders))}>Alle</button>
                  <button className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => setCardHolderFilter(new Set())}>Nullstill</button>
                </div>
                {allCardHolders.map(ch => (
                  <label key={ch} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox checked={cardHolderFilter.has(ch)} onCheckedChange={() => setCardHolderFilter(prev => toggleInSet(prev, ch))} />
                    {ch}
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
        <div className="ml-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Les inn filer på nytt"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Totalt forbruk" value={formatNOK(Math.abs(totalExpenses))} icon={TrendingDown} className="bg-destructive/10 text-destructive" />
        <StatCard title="Inntekter" value={formatNOK(totalIncome)} icon={TrendingUp} className="bg-green-100 text-green-700" />
        <StatCard title="Netto" value={formatNOK(totalIncome + totalExpenses)} icon={ArrowUpDown} className="bg-primary/10 text-primary" />
      </div>

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
                   <th className="pb-2 font-medium">Bruker</th>
                   <th className="pb-2 font-medium text-right">Beløp</th>
                 </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-2 text-muted-foreground">{format(t.date, 'dd.MM.yy')}</td>
                    <td className="py-2 max-w-48 truncate">{t.description}</td>
                    <td className="py-1">
                      <Select
                        value={t.category}
                        onValueChange={async (val) => {
                          try {
                            const count = await updateCategory(t.id, val as Category);
                            toast({ title: 'Kategori oppdatert', description: `${count} transaksjon${count > 1 ? 'er' : ''} med «${t.description}» ble oppdatert` });
                          } catch {
                            toast({ title: 'Feil', description: 'Kunne ikke oppdatere kategori', variant: 'destructive' });
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 w-auto min-w-[120px] border-0 bg-transparent px-1 text-xs shadow-none hover:bg-muted">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[t.category] }} />
                            <SelectValue />
                          </span>
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {Object.entries(CATEGORY_LABELS).sort(([,a],[,b]) => a.localeCompare(b)).map(([key, label]) => (
                            <SelectItem key={key} value={key} className="text-xs">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[key as Category] }} />
                                {label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-2 text-muted-foreground text-xs">{t.sourceLabel}</td>
                    <td className="py-2 text-xs font-medium">{t.cardHolder || '–'}</td>
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

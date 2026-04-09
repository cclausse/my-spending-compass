import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTransactions } from '@/context/TransactionContext';
import { CATEGORY_LABELS, CATEGORY_COLORS, Category, CostType, COST_TYPE_LABELS } from '@/types/transaction';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, Legend } from 'recharts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TrendingDown, TrendingUp, Wallet, ArrowUpDown, Filter, Search, Calendar, CreditCard, RefreshCw, User, Lock, Maximize2, Minimize2 } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
  ALL_COST_TYPES,
  areSetsEqual,
  filterByCardHolder,
  filterByCategory,
  filterByDescriptionAndCostType,
  filterByMonthAndSource,
  getAllMonths,
  getAllSources,
  getAvailableCardHolders,
  getAvailableCategories,
  getAvailableDescriptions,
  isDefaultSelection,
  reconcileSelection,
} from '@/lib/dashboardFilters';

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
  const { transactions, loading, refreshTransactions, updateCategory, updateCostType } = useTransactions();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<Set<string>>(new Set());
  const [sourceFilter, setSourceFilter] = useState<Set<string>>(new Set());
  const [cardHolderFilter, setCardHolderFilter] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<Set<Category>>(new Set());
  const [descriptionFilter, setDescriptionFilter] = useState<Set<string>>(new Set());
  const [costTypeFilter, setCostTypeFilter] = useState<Set<CostType>>(new Set(['F', 'V']));
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
  const allMonths = useMemo(() => getAllMonths(transactions), [transactions]);

  const allSources = useMemo(() => getAllSources(transactions), [transactions]);

  // Initialize all filters to "all selected" on first data load
  useEffect(() => {
    if (transactions.length > 0 && !initialized.current) {
      initialized.current = true;
      setMonthFilter(new Set(allMonths));
      setSourceFilter(new Set(allSources));
    }
  }, [transactions, allMonths, allSources]);

  useEffect(() => {
    if (!initialized.current) return;

    setMonthFilter((prev) => {
      const next = reconcileSelection(prev, allMonths);
      return areSetsEqual(prev, next) ? prev : next;
    });
  }, [allMonths]);

  useEffect(() => {
    if (!initialized.current) return;

    setSourceFilter((prev) => {
      const next = reconcileSelection(prev, allSources);
      return areSetsEqual(prev, next) ? prev : next;
    });
  }, [allSources]);

  // Step 1: filter by period + source
  const afterPeriodAndSource = useMemo(
    () => filterByMonthAndSource(transactions, monthFilter, sourceFilter),
    [transactions, monthFilter, sourceFilter],
  );

  const availableCardHolders = useMemo(() => getAvailableCardHolders(afterPeriodAndSource), [afterPeriodAndSource]);

  useEffect(() => {
    setCardHolderFilter((prev) => {
      const next = reconcileSelection(prev, availableCardHolders);
      return areSetsEqual(prev, next) ? prev : next;
    });
  }, [availableCardHolders]);

  const afterCardHolder = useMemo(
    () => filterByCardHolder(afterPeriodAndSource, cardHolderFilter),
    [afterPeriodAndSource, cardHolderFilter],
  );

  // Available categories based on current upstream selections
  const availableCategories = useMemo(() => getAvailableCategories(afterCardHolder), [afterCardHolder]);

  useEffect(() => {
    setCategoryFilter((prev) => {
      const next = reconcileSelection(prev, availableCategories);
      return areSetsEqual(prev, next) ? prev : next;
    });
  }, [availableCategories]);

  // Step 2: filter by category
  const afterCategory = useMemo(() => filterByCategory(afterCardHolder, categoryFilter), [afterCardHolder, categoryFilter]);

  // Available descriptions based on current upstream selections
  const availableDescriptions = useMemo(() => getAvailableDescriptions(afterCategory), [afterCategory]);

  useEffect(() => {
    setDescriptionFilter((prev) => {
      const next = reconcileSelection(prev, availableDescriptions);
      return areSetsEqual(prev, next) ? prev : next;
    });
  }, [availableDescriptions]);

  // Step 3: final filtered result
  const filtered = useMemo(
    () => filterByDescriptionAndCostType(afterCategory, descriptionFilter, costTypeFilter),
    [afterCategory, descriptionFilter, costTypeFilter],
  );

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
    const map = new Map<string, { month: string; fixedExpenses: number; variableExpenses: number; income: number }>();
    filtered.forEach(t => {
      const m = format(t.date, 'MMM yy', { locale: nb });
      const key = format(t.date, 'yyyy-MM');
      if (!map.has(key)) map.set(key, { month: m, fixedExpenses: 0, variableExpenses: 0, income: 0 });
      const entry = map.get(key)!;
      if (t.amount < 0) {
        if (t.costType === 'F') entry.fixedExpenses += Math.abs(t.amount);
        else entry.variableExpenses += Math.abs(t.amount);
      } else {
        entry.income += t.amount;
      }
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
               {isDefaultSelection(monthFilter, allMonths) ? 'Alle perioder' : `${monthFilter.size} perioder`}
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
               {isDefaultSelection(sourceFilter, allSources) ? 'Alle kontoer' : `${sourceFilter.size} kontoer`}
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
               {availableCategories.length === 0 ? 'Ingen kategorier' : isDefaultSelection(categoryFilter, availableCategories) ? 'Alle kategorier' : `${categoryFilter.size} kategorier`}
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
               {isDefaultSelection(descriptionFilter, availableDescriptions) ? 'Alle beskrivelser' : `${descriptionFilter.size} valgt`}
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
         {availableCardHolders.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-48 justify-start gap-2">
                <User className="h-4 w-4" />
                {isDefaultSelection(cardHolderFilter, availableCardHolders) ? 'Alle brukere' : `${cardHolderFilter.size} brukere`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 max-h-72 overflow-y-auto p-3" align="start">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => setCardHolderFilter(new Set(availableCardHolders))}>Alle</button>
                  <button className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => setCardHolderFilter(new Set())}>Nullstill</button>
                </div>
                {availableCardHolders.map(ch => (
                  <label key={ch} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox checked={cardHolderFilter.has(ch)} onCheckedChange={() => setCardHolderFilter(prev => toggleInSet(prev, ch))} />
                    {ch}
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
        {/* Cost type filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-40 justify-start gap-2">
              <Lock className="h-4 w-4" />
               {isDefaultSelection(costTypeFilter, ALL_COST_TYPES) ? 'Alle' : [...costTypeFilter].map(c => COST_TYPE_LABELS[c]).join(', ')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-3" align="start">
            <div className="space-y-2">
              <div className="flex gap-2">
                 <button className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => setCostTypeFilter(new Set(ALL_COST_TYPES))}>Alle</button>
                <button className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => setCostTypeFilter(new Set())}>Nullstill</button>
              </div>
               {ALL_COST_TYPES.map(ct => (
                <label key={ct} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox checked={costTypeFilter.has(ct)} onCheckedChange={() => setCostTypeFilter(prev => toggleInSet(prev, ct))} />
                  {COST_TYPE_LABELS[ct]}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

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

      <div className={`grid gap-6 ${expandedCard && expandedCard !== 'transactions' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        {/* Category Pie */}
        {(!expandedCard || expandedCard === 'pie') && (
        <Card className={`transition-all duration-300 ease-out ${expandedCard === 'pie' ? 'col-span-full animate-scale-in' : 'animate-fade-in'}`}>
          <CardHeader className="relative">
            <CardTitle className="text-base">Forbruk per kategori</CardTitle>
            <Button variant="ghost" size="icon" className="absolute top-3 right-3 h-7 w-7" onClick={() => setExpandedCard(prev => prev === 'pie' ? null : 'pie')} title={expandedCard === 'pie' ? 'Minimer' : 'Utvid'}>
              {expandedCard === 'pie' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <CardContent>
            <div className={`transition-all duration-300 ease-out ${expandedCard === 'pie' ? 'h-[500px]' : 'h-72'}`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={expandedCard === 'pie' ? 160 : 100} dataKey="value" paddingAngle={2}>
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
        )}

        {/* Monthly Bar */}
        {(!expandedCard || expandedCard === 'bar') && (
        <Card className={`transition-all duration-300 ease-out ${expandedCard === 'bar' ? 'col-span-full animate-scale-in' : 'animate-fade-in'}`}>
          <CardHeader className="relative">
            <CardTitle className="text-base">Månedlig oversikt</CardTitle>
            <Button variant="ghost" size="icon" className="absolute top-3 right-3 h-7 w-7" onClick={() => setExpandedCard(prev => prev === 'bar' ? null : 'bar')} title={expandedCard === 'bar' ? 'Minimer' : 'Utvid'}>
              {expandedCard === 'bar' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <CardContent>
            <div className={`transition-all duration-300 ease-out ${expandedCard === 'bar' ? 'h-[500px]' : 'h-72'}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${Math.round(v / 1000)}k`} className="text-muted-foreground" />
                  <Tooltip formatter={(val: number) => formatNOK(val)} />
                  <Legend />
                  <Bar dataKey="fixedExpenses" name="Faste" stackId="expenses" fill="hsl(0, 45%, 45%)" />
                  <Bar dataKey="variableExpenses" name="Variable" stackId="expenses" fill="hsl(0, 65%, 65%)" radius={[4, 4, 0, 0]}>
                    <LabelList
                      valueAccessor={(entry: { fixedExpenses: number; variableExpenses: number }) => entry.fixedExpenses + entry.variableExpenses}
                      formatter={(val: number) => val > 0 ? `${Math.round(val / 1000)}k` : ''}
                      position="top"
                      style={{ fontSize: 11, fill: 'hsl(0, 65%, 55%)', fontWeight: 600 }}
                    />
                  </Bar>
                  <Bar dataKey="income" name="Inntekt" fill="hsl(142, 60%, 45%)" radius={[4, 4, 0, 0]}>
                    <LabelList
                      formatter={(val: number) => val > 0 ? `${Math.round(val / 1000)}k` : ''}
                      position="top"
                      style={{ fontSize: 11, fill: 'hsl(142, 60%, 45%)', fontWeight: 600 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        )}
      </div>

      {(!expandedCard || expandedCard === 'transactions') && (
      <Card className="transition-all duration-300 ease-out animate-fade-in">
        <CardHeader className="relative">
          <CardTitle className="text-base">Transaksjoner ({filtered.length})</CardTitle>
          <Button variant="ghost" size="icon" className="absolute top-3 right-3 h-7 w-7" onClick={() => setExpandedCard(prev => prev === 'transactions' ? null : 'transactions')} title={expandedCard === 'transactions' ? 'Minimer' : 'Utvid'}>
            {expandedCard === 'transactions' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </CardHeader>
        <CardContent>
          <div className={expandedCard === 'transactions' ? 'max-h-[80vh] overflow-y-auto' : 'max-h-96 overflow-y-auto'}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                 <tr className="border-b text-left text-muted-foreground">
                   <th className="pb-2 font-medium">Dato</th>
                   <th className="pb-2 font-medium">Beskrivelse</th>
                   <th className="pb-2 font-medium">Kategori</th>
                   <th className="pb-2 font-medium">Kilde</th>
                    <th className="pb-2 font-medium">Bruker</th>
                    <th className="pb-2 font-medium">Type</th>
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
                    <td className="py-1">
                      <button
                        className={`text-xs font-bold px-2 py-0.5 rounded cursor-pointer ${
                          t.costType === 'F' ? 'bg-primary/15 text-primary' 
                          : t.costType === 'I' ? 'bg-destructive/15 text-destructive' 
                          : 'bg-muted text-muted-foreground'
                        }`}
                        onClick={async () => {
                          const cycle: Record<CostType, CostType> = { V: 'F', F: 'I', I: 'V' };
                          const newType = cycle[t.costType];
                          try {
                            const count = await updateCostType(t.id, newType);
                            toast({ title: 'Type oppdatert', description: `${count} transaksjon${count > 1 ? 'er' : ''} med «${t.description}» satt til ${COST_TYPE_LABELS[newType]}` });
                          } catch {
                            toast({ title: 'Feil', description: 'Kunne ikke oppdatere type', variant: 'destructive' });
                          }
                        }}
                        title={`Klikk for å endre (V→F→I→V)`}
                      >
                        {t.costType}
                      </button>
                    </td>
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
      )}
    </div>
  );
}

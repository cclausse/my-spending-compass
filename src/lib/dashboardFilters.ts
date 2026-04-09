import { format } from 'date-fns';
import { CATEGORY_LABELS, Category, CostType, Transaction } from '@/types/transaction';

export const ALL_COST_TYPES: CostType[] = ['F', 'V', 'I'];

export function areSetsEqual<T>(left: ReadonlySet<T>, right: ReadonlySet<T>) {
  if (left.size !== right.size) return false;
  for (const item of left) {
    if (!right.has(item)) return false;
  }
  return true;
}

export function reconcileSelection<T>(selected: ReadonlySet<T>, available: readonly T[]) {
  if (selected.size === 0) return new Set<T>();

  const availableSet = new Set(available);
  return new Set([...selected].filter((item) => availableSet.has(item)));
}

export function isDefaultSelection<T>(selected: ReadonlySet<T>, available: readonly T[]) {
  return selected.size === 0 || selected.size === available.length;
}

export function getAllMonths(transactions: Transaction[]) {
  const set = new Set<string>();
  transactions.forEach((transaction) => set.add(format(transaction.date, 'yyyy-MM')));
  return Array.from(set).sort().reverse();
}

export function getAllSources(transactions: Transaction[]) {
  const set = new Set<string>();
  transactions.forEach((transaction) => set.add(transaction.sourceLabel));
  return Array.from(set).sort();
}

export function filterByMonthAndSource(
  transactions: Transaction[],
  monthFilter: ReadonlySet<string>,
  sourceFilter: ReadonlySet<string>,
) {
  return transactions.filter((transaction) => {
    const matchesMonth = monthFilter.size === 0 || monthFilter.has(format(transaction.date, 'yyyy-MM'));
    const matchesSource = sourceFilter.size === 0 || sourceFilter.has(transaction.sourceLabel);
    return matchesMonth && matchesSource;
  });
}

export function getAvailableCardHolders(transactions: Transaction[]) {
  const set = new Set<string>();
  transactions.forEach((transaction) => {
    if (transaction.cardHolder) set.add(transaction.cardHolder);
  });
  return Array.from(set).sort();
}

export function filterByCardHolder(transactions: Transaction[], cardHolderFilter: ReadonlySet<string>) {
  if (cardHolderFilter.size === 0) return transactions;
  return transactions.filter((transaction) => !transaction.cardHolder || cardHolderFilter.has(transaction.cardHolder));
}

export function getAvailableCategories(transactions: Transaction[]) {
  const set = new Set<Category>();
  transactions.forEach((transaction) => set.add(transaction.category));
  return Array.from(set).sort((left, right) => CATEGORY_LABELS[left].localeCompare(CATEGORY_LABELS[right]));
}

export function filterByCategory(transactions: Transaction[], categoryFilter: ReadonlySet<Category>) {
  if (categoryFilter.size === 0) return transactions;
  return transactions.filter((transaction) => categoryFilter.has(transaction.category));
}

export function getAvailableDescriptions(transactions: Transaction[]) {
  const set = new Set<string>();
  transactions.forEach((transaction) => set.add(transaction.description));
  return Array.from(set).sort();
}

export function filterByDescriptionAndCostType(
  transactions: Transaction[],
  descriptionFilter: ReadonlySet<string>,
  costTypeFilter: ReadonlySet<CostType>,
) {
  let filtered = transactions;

  if (descriptionFilter.size > 0) {
    filtered = filtered.filter((transaction) => descriptionFilter.has(transaction.description));
  }

  if (costTypeFilter.size > 0 && costTypeFilter.size < ALL_COST_TYPES.length) {
    filtered = filtered.filter((transaction) => costTypeFilter.has(transaction.costType));
  }

  return filtered;
}
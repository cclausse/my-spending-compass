import { describe, expect, it } from 'vitest';
import { Category, CostType, Transaction } from '@/types/transaction';
import {
  filterByCardHolder,
  filterByCategory,
  filterByDescriptionAndCostType,
  filterByMonthAndSource,
  getAvailableCardHolders,
  getAvailableCategories,
  getAvailableDescriptions,
  reconcileSelection,
} from '@/lib/dashboardFilters';

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    date: overrides.date ?? new Date('2026-01-01T12:00:00Z'),
    description: overrides.description ?? 'Test',
    amount: overrides.amount ?? -100,
    category: overrides.category ?? 'annet',
    source: overrides.source ?? 'bank',
    sourceLabel: overrides.sourceLabel ?? 'Regningskonto',
    cardHolder: overrides.cardHolder,
    costType: overrides.costType ?? 'V',
    rawData: overrides.rawData,
  };
}

describe('dashboardFilters', () => {
  it('reconciles stale selections so january 2026 without regningskonto still shows non-bank transactions', () => {
    const transactions: Transaction[] = [
      makeTransaction({ id: '1', description: 'LYSE TELE', source: 'bank', sourceLabel: 'Regningskonto', category: 'tv_media' }),
      makeTransaction({ id: '2', description: 'REMA 1000', source: 'bank', sourceLabel: 'Regningskonto', category: 'dagligvarer' }),
      makeTransaction({ id: '3', description: 'AMEX FLY', source: 'amex', sourceLabel: 'AMEX', category: 'reise' }),
      makeTransaction({ id: '4', description: 'SAS HOTELL', source: 'sasmc', sourceLabel: 'SAS MC', category: 'reise', cardHolder: 'CC' }),
    ];

    const januaryNonBank = filterByMonthAndSource(
      transactions,
      new Set(['2026-01']),
      new Set(['AMEX', 'SAS MC']),
    );

    const availableCardHolders = getAvailableCardHolders(januaryNonBank);
    const effectiveCardHolders = reconcileSelection(new Set(['ABC']), availableCardHolders);
    const afterCardHolder = filterByCardHolder(januaryNonBank, effectiveCardHolders);

    const availableCategories = getAvailableCategories(afterCardHolder);
    const effectiveCategories = reconcileSelection(new Set<Category>(['tv_media']), availableCategories);
    const afterCategory = filterByCategory(afterCardHolder, effectiveCategories);

    const availableDescriptions = getAvailableDescriptions(afterCategory);
    const effectiveDescriptions = reconcileSelection(new Set(['LYSE TELE', 'REMA 1000']), availableDescriptions);
    const filtered = filterByDescriptionAndCostType(afterCategory, effectiveDescriptions, new Set<CostType>(['F', 'V']));

    expect(filtered.map((transaction) => transaction.description)).toEqual(['AMEX FLY', 'SAS HOTELL']);
  });

  it('keeps valid overlapping selections when upstream filters change', () => {
    const availableDescriptions = ['AMEX FLY', 'SAS HOTELL', 'UBER'];

    expect(reconcileSelection(new Set(['AMEX FLY', 'LYSE TELE']), availableDescriptions)).toEqual(new Set(['AMEX FLY']));
  });
});
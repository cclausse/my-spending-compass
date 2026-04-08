import { Transaction, TransactionSource } from '@/types/transaction';
import { categorize } from './categorize';

let idCounter = 0;
const nextId = () => `txn-${++idCounter}`;

function parseNorwegianDate(s: string): Date {
  const [d, m, y] = s.split('.');
  return new Date(+y, +m - 1, +d);
}

function parseUSDate(s: string): Date {
  const [m, d, y] = s.split('/');
  return new Date(+y, +m - 1, +d);
}

function parseNorwegianNumber(s: string): number {
  // Handle Unicode minus (−) and regular minus (-), then Norwegian number format
  const cleaned = s.replace(/\u2212/g, '-').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned);
}

function stripQuotes(s: string): string {
  return s.replace(/^"(.*)"$/, '$1').trim();
}

export function detectFormat(content: string, fileName: string): TransactionSource | null {
  if (fileName.toLowerCase().endsWith('.xlsx')) return null;

  const firstLine = content.split('\n')[0];
  // Bank: semicolon-separated with Dato
  if (firstLine.includes(';') && /Dato/.test(firstLine)) return 'bank';
  // AMEX: comma-separated with Dato and Beløp
  if (firstLine.includes(',') && /Dato/.test(firstLine)) return 'amex';
  return null;
}

export function parseBankCSV(content: string): Transaction[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const transactions: Transaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(';').map(stripQuotes);
    if (cols.length < 5) continue;

    const dato = cols[0];
    const beskrivelse = cols[1];
    const inn = cols[3];
    const ut = cols[4];

    if (!dato || !beskrivelse) continue;

    let amount = 0;
    if (inn && inn !== '') amount = parseNorwegianNumber(inn);
    else if (ut && ut !== '') amount = -Math.abs(parseNorwegianNumber(ut));

    if (amount === 0 || isNaN(amount)) continue;

    transactions.push({
      id: nextId(),
      date: parseNorwegianDate(dato),
      description: beskrivelse,
      amount,
      category: categorize(beskrivelse, 'bank'),
      source: 'bank',
      sourceLabel: 'Regningskonto',
      costType: 'V',
  }

  return transactions;
}

export function parseAmexCSV(content: string): Transaction[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const transactions: Transaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);
    if (cols.length < 5) continue;

    const dato = cols[0]?.trim();
    const beskrivelse = cols[1]?.trim();
    const belopStr = cols[4]?.trim();

    if (!dato || !beskrivelse || !belopStr) continue;

    const amount = parseNorwegianNumber(belopStr);
    if (isNaN(amount)) continue;

    // AMEX: positive values are expenses (negate them), negative values are payments/credits (keep as positive)
    const normalizedAmount = amount > 0 ? -amount : Math.abs(amount);

    transactions.push({
      id: nextId(),
      date: parseUSDate(dato),
      description: beskrivelse,
      amount: normalizedAmount,
      category: categorize(beskrivelse, 'amex'),
      source: 'amex',
      sourceLabel: 'AMEX',
      costType: 'V',
  }

  return transactions;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

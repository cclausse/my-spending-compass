import { Transaction, TransactionSource } from '@/types/transaction';
import { categorize } from './categorize';

let idCounter = 0;
const nextId = () => `txn-${++idCounter}`;

function parseNorwegianDate(s: string): Date {
  // dd.mm.yyyy
  const [d, m, y] = s.split('.');
  return new Date(+y, +m - 1, +d);
}

function parseUSDate(s: string): Date {
  // MM/DD/YYYY
  const [m, d, y] = s.split('/');
  return new Date(+y, +m - 1, +d);
}

function parseNorwegianNumber(s: string): number {
  // "1.234,56" → 1234.56 or just "1234,56"
  return parseFloat(s.replace(/\./g, '').replace(',', '.'));
}

export function detectFormat(content: string, fileName: string): TransactionSource | null {
  if (fileName.toLowerCase().endsWith('.xlsx')) return null; // not supported yet
  
  const firstLine = content.split('\n')[0];
  if (firstLine.includes(';') && firstLine.includes('Dato')) return 'bank';
  if (firstLine.includes(',') && firstLine.includes('Dato')) return 'amex';
  return null;
}

export function parseBankCSV(content: string): Transaction[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];
  
  const transactions: Transaction[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cols = line.split(';');
    if (cols.length < 5) continue;
    
    const dato = cols[0]?.trim();
    const beskrivelse = cols[1]?.trim();
    const inn = cols[3]?.trim();
    const ut = cols[4]?.trim();
    
    if (!dato || !beskrivelse) continue;
    
    let amount = 0;
    if (inn && inn !== '') amount = parseNorwegianNumber(inn);
    else if (ut && ut !== '') amount = -parseNorwegianNumber(ut);
    
    if (amount === 0) continue;
    
    transactions.push({
      id: nextId(),
      date: parseNorwegianDate(dato),
      description: beskrivelse,
      amount,
      category: categorize(beskrivelse),
      source: 'bank',
      sourceLabel: 'Regningskonto',
    });
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
    
    // Handle CSV with possible quoted fields
    const cols = parseCSVLine(line);
    if (cols.length < 5) continue;
    
    const dato = cols[0]?.trim();
    const beskrivelse = cols[2]?.trim();
    const belopStr = cols[4]?.trim();
    
    if (!dato || !beskrivelse || !belopStr) continue;
    
    const amount = parseNorwegianNumber(belopStr);
    if (isNaN(amount)) continue;
    
    transactions.push({
      id: nextId(),
      date: parseUSDate(dato),
      description: beskrivelse,
      amount: -Math.abs(amount), // AMEX: positive = expense
      category: categorize(beskrivelse),
      source: 'amex',
      sourceLabel: 'AMEX',
    });
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

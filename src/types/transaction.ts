export type TransactionSource = 'bank' | 'amex' | 'sasmc' | 'banknorwegian';

export type Category =
  | 'mat'
  | 'transport'
  | 'bolig'
  | 'forsikring'
  | 'underholdning'
  | 'klaer'
  | 'helse'
  | 'reise'
  | 'abonnementer'
  | 'overforinger'
  | 'inntekt'
  | 'annet';

export const CATEGORY_LABELS: Record<Category, string> = {
  mat: 'Mat & Dagligvarer',
  transport: 'Transport',
  bolig: 'Bolig & Strøm',
  forsikring: 'Forsikring',
  underholdning: 'Underholdning',
  klaer: 'Klær & Sko',
  helse: 'Helse',
  reise: 'Reise',
  abonnementer: 'Abonnementer',
  overforinger: 'Overføringer',
  inntekt: 'Inntekt',
  annet: 'Annet',
};

export const CATEGORY_COLORS: Record<Category, string> = {
  mat: 'hsl(142, 60%, 45%)',
  transport: 'hsl(210, 70%, 50%)',
  bolig: 'hsl(25, 80%, 55%)',
  forsikring: 'hsl(280, 55%, 55%)',
  underholdning: 'hsl(340, 65%, 55%)',
  klaer: 'hsl(190, 60%, 45%)',
  helse: 'hsl(0, 65%, 55%)',
  reise: 'hsl(50, 75%, 50%)',
  abonnementer: 'hsl(160, 50%, 45%)',
  overforinger: 'hsl(220, 30%, 60%)',
  inntekt: 'hsl(120, 50%, 40%)',
  annet: 'hsl(0, 0%, 55%)',
};

export interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number; // negative = expense, positive = income
  category: Category;
  source: TransactionSource;
  sourceLabel: string;
  rawData?: Record<string, string>;
}

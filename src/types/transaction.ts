export type TransactionSource = 'bank' | 'amex' | 'sasmc' | 'banknorwegian';

export type Category =
  | 'dagligvarer'
  | 'restaurant'
  | 'transport'
  | 'reise'
  | 'tv_media'
  | 'trening'
  | 'mobil'
  | 'elektronikk'
  | 'helse'
  | 'klaer'
  | 'sparkesykkel'
  | 'kafe'
  | 'hus_hjem'
  | 'bil'
  | 'jobb'
  | 'innbetaling'
  | 'polet'
  | 'konserter'
  | 'sport_fritid'
  | 'gebyrer'
  | 'bolig'
  | 'forsikring'
  | 'overforinger'
  | 'annet';

export const CATEGORY_LABELS: Record<Category, string> = {
  dagligvarer: 'Dagligvarer',
  restaurant: 'Restaurant/Kafé',
  transport: 'Transport',
  reise: 'Reiser',
  tv_media: 'TV/Media/Internet',
  trening: 'Trening',
  mobil: 'Mobil',
  elektronikk: 'Elektronikk/Leker',
  helse: 'Helse',
  klaer: 'Klær/Sko',
  sparkesykkel: 'Sparkesykkel',
  kafe: 'Kafé',
  hus_hjem: 'Hus/Hjem',
  bil: 'Bil',
  jobb: 'Utelates/Jobb',
  innbetaling: 'Innbetaling',
  polet: 'Polet',
  konserter: 'Konserter',
  sport_fritid: 'Sport/Fritid',
  gebyrer: 'Gebyrer',
  bolig: 'Bolig & Strøm',
  forsikring: 'Forsikring',
  overforinger: 'Overføringer',
  annet: 'Annet',
};

export const CATEGORY_COLORS: Record<Category, string> = {
  dagligvarer: 'hsl(142, 60%, 45%)',
  restaurant: 'hsl(25, 80%, 55%)',
  transport: 'hsl(210, 70%, 50%)',
  reise: 'hsl(50, 75%, 50%)',
  tv_media: 'hsl(280, 55%, 55%)',
  trening: 'hsl(160, 50%, 45%)',
  mobil: 'hsl(190, 60%, 45%)',
  elektronikk: 'hsl(340, 65%, 55%)',
  helse: 'hsl(0, 65%, 55%)',
  klaer: 'hsl(300, 50%, 55%)',
  sparkesykkel: 'hsl(80, 60%, 45%)',
  kafe: 'hsl(35, 70%, 50%)',
  hus_hjem: 'hsl(15, 60%, 50%)',
  bil: 'hsl(220, 60%, 50%)',
  jobb: 'hsl(200, 30%, 60%)',
  innbetaling: 'hsl(120, 50%, 40%)',
  polet: 'hsl(0, 50%, 40%)',
  konserter: 'hsl(270, 60%, 55%)',
  sport_fritid: 'hsl(100, 50%, 45%)',
  gebyrer: 'hsl(0, 0%, 45%)',
  bolig: 'hsl(40, 60%, 50%)',
  forsikring: 'hsl(240, 40%, 55%)',
  overforinger: 'hsl(220, 30%, 60%)',
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

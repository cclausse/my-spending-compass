import { Category } from '@/types/transaction';

const rules: Array<{ pattern: RegExp; category: Category }> = [
  // Mat
  { pattern: /rema|kiwi|bunnpris|coop|meny|spar\b|extra|joker|europris|dagligvare|grocery|supermarket|bakeri|restaurant|cafe|pizza|burger|sushi|mat\b|food/i, category: 'mat' },
  // Transport
  { pattern: /circle\s?k|esso|shell|st1|uno-x|bensin|fuel|taxi|uber|bolt|ruter|atb|kolumbus|skyss|flybuss|parkering|parking|bom\b|toll|autopass/i, category: 'transport' },
  // Bolig
  { pattern: /husleie|leie|strøm|strom|fjordkraft|tibber|hafslund|lyse|agva|kommunale|vann\b|avfall|renovasjon|felleskost|borettslag|sameie/i, category: 'bolig' },
  // Forsikring
  { pattern: /forsikring|insurance|if\b|gjensidige|tryg|fremtind|storebrand|dnb\s?forsikring|codan/i, category: 'forsikring' },
  // Reise
  { pattern: /sas\b|norwegian\b|widerøe|fly\b|flight|hotel|airbnb|booking\.com|radisson|scandic|thon|hurtigruten/i, category: 'reise' },
  // Underholdning
  { pattern: /netflix|spotify|hbo|disney|youtube|viaplay|tv2\s?sumo|kino|cinema|teater|konsert|ticketmaster|billettt/i, category: 'underholdning' },
  // Abonnementer
  { pattern: /telenor|telia|ice\b|altibox|get\b|canal\s?digital|apple\.com|google\s?storage|icloud|microsoft|adobe/i, category: 'abonnementer' },
  // Klær
  { pattern: /h&m|zara|cubus|dressmann|stormberg|xxl|sport1|intersport|nike|adidas|zalando|boozt/i, category: 'klaer' },
  // Helse
  { pattern: /apotek|pharmacy|lege|legevakt|tannlege|dentist|sykehus|hospital|helsestasjon|optiker|brilleland|synsam/i, category: 'helse' },
  // Overføringer
  { pattern: /overføring|overf|vipps|nettbank|mobilbank|til\s?konto|fra\s?konto/i, category: 'overforinger' },
  // Inntekt
  { pattern: /lønn|lonn|salary|utbetaling|refusjon|tilbakebetaling|refund/i, category: 'inntekt' },
];

export function categorize(description: string): Category {
  const lower = description.toLowerCase();
  for (const rule of rules) {
    if (rule.pattern.test(lower)) {
      return rule.category;
    }
  }
  return 'annet';
}

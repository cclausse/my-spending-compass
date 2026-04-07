import { Category } from '@/types/transaction';

const rules: Array<{ keys: string[]; category: Category }> = [
  { keys: ['extra', 'joker', 'rema', 'kiwi', 'coop', 'bunnpris', 'spar', 'meny', 'obs city lade', 'city syd'], category: 'dagligvarer' },
  { keys: ['8446-v2', 'pizza', 'det sorte faar', 'fox grill', 'arsenal footbal', 'hard rock', 'cafe', 'espresso', 'restaurant', 'nandos', 'wildwood kitchen', 'feniqia', 'amundsen bryggeri', 'grilleriet'], category: 'restaurant' },
  { keys: ['tfl travel', 'vy', 'ruter', 'uber', 'bolt', 'bensin', 'circle k', 'shell', 'entur web', 'atb app'], category: 'transport' },
  { keys: ['tilburg', 'trainline', 'relay 373522 nice', 'chez pipo', 'antibes', 'hotel', 'airbnb', 'booking', 'sas', 'norwegian', 'juan les pins', 'duty-free', 'a316'], category: 'reise' },
  { keys: ['resumaker', 'telenor', 'ark valentinlyst', 'apple', 'aws', 'disney', 'strim', 'prime', 'spotify', 'netflix', 'icloud', 'tv2', 'tv 2'], category: 'tv_media' },
  { keys: ['zwift', 'spond', 'trainerroad'], category: 'trening' },
  { keys: ['lyse tele'], category: 'mobil' },
  { keys: ['hamleys', 'elkjop', 'power', 'komplett'], category: 'elektronikk' },
  { keys: ['apotek', 'boots', 'legen', 'tannlege', 'vita2700trondheimt'], category: 'helse' },
  { keys: ['retro', 'carma', 'classic footbal', 'xxl', 'nike', 'adidas', 'zalando', 'hm', 'h&m', 'cubus', 'lillywhites', 'mango london'], category: 'klaer' },
  { keys: ['voi', 'dott', 'ryde'], category: 'sparkesykkel' },
  { keys: ['trd olearys', 'bakeri', 'dromedar', 'sprø', 'snurr'], category: 'kafe' },
  { keys: ['bill kill as=trondheim', 'ikea', 'felleskjoepet', 'clas ohlson', 'biltema', 'bygg', 'gjenvinningsstasjon'], category: 'hus_hjem' },
  { keys: ['hyre', 'tesla'], category: 'bil' },
  { keys: ['espos', 'kahoot', 'openai', 'chatgpt', 'pluralsight'], category: 'jobb' },
  { keys: ['refund', 'reversal', 'payment received', 'credit', 'tilbakeføring', 'takk'], category: 'innbetaling' },
  { keys: ['polet'], category: 'polet' },
  { keys: ['ticketmaster'], category: 'konserter' },
  { keys: ['sport', 'medlem', 'vertical playground'], category: 'sport_fritid' },
  { keys: ['fee', 'gebyr'], category: 'gebyrer' },
  { keys: ['husleie', 'leie', 'strøm', 'fjordkraft', 'tibber', 'hafslund', 'lyse', 'kommunale', 'vann', 'avfall', 'renovasjon', 'felleskost', 'borettslag', 'sameie'], category: 'bolig' },
  { keys: ['forsikring', 'insurance', 'gjensidige', 'tryg', 'fremtind', 'storebrand'], category: 'forsikring' },
  { keys: ['overføring', 'vipps', 'nettbank'], category: 'overforinger' },
];

export function categorize(description: string): Category {
  const d = description.toLowerCase();
  for (const rule of rules) {
    if (rule.keys.some(k => d.includes(k))) {
      return rule.category;
    }
  }
  return 'annet';
}

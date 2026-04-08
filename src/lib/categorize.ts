import { Category, TransactionSource } from "@/types/transaction";

type Rule = { keys: string[]; category: Category };

const bankRules: Rule[] = [
  { keys: ["hyre", "tesla"], category: "bil" },
  { keys: ["flyt", "apcoa", "bom", "vegamot"], category: "bom_parkering" },
  {
    keys: [
      "huseiernes",
      "verisure",
      "alarmabonnement",
      "trondheim komm",
      "oppdal kommune",
      "kommunale",
      "vekst oppdal",
      "remidt",
      "trh kommune",
      "1885 16 89423 ved",
    ],
    category: "bolig_hytte",
  },
  { keys: ["tobb/bbl finans", "norsk medisinaldepot"], category: "berge_sr" },
  { keys: ["samfunnsviterne", "nito", "leeds"], category: "lag_foreninger" },
  {
    keys: [
      "gisle aasgaard",
      "brage andreas",
      "egil haave",
      "ingrid rongved skui",
      "thea kraugerud tønder",
      "sverre lo",
      "marit herrem",
      "kåre kolve",
    ],
    category: "eksterne_overforinger",
  },
  { keys: ["hamleys", "elkjop", "power", "komplett"], category: "elektronikk" },
  { keys: ["forsikring", "fremtind", "storebrand", "gjensidige"], category: "forsikring" },
  { keys: ["varsling", "gebyr", "zolva", "trumfp", "intrum", "kravia"], category: "gebyrer" },
  { keys: ["dronningens tenner", "apotek", "boots", "legen", "tannlege", "melin collectors"], category: "helse" },
  { keys: ["lån", "statens pensjon"], category: "laan" },
  { keys: ["lyse tele"], category: "mobil" },
  { keys: ["credicare", "collectia", "payex", "4212 58 85130 fakturanummer 716"], category: "ikke_bestemt" },
  { keys: ["claussen", "berge", "regninger"], category: "interne_overforinger" },
  {
    keys: ["ref: 20129268", "refund", "reversal", "payment received", "credit", "tilbakeføring", "takk"],
    category: "innbetaling",
  },
  {
    keys: ["american express", "santander", "sparebank 1 kreditt", "seb kort", "kredittbanken"],
    category: "kredittkort",
  },
  { keys: ["hofstad"], category: "kultur" },
  { keys: ["ticketmaster"], category: "konserter" },
  { keys: ["feriekonto sbanken", "sbanken - et konsept fra dnb"], category: "per" },
  { keys: ["polet"], category: "polet" },
  {
    keys: [
      "tilburg",
      "trainline",
      "relay 373522 nice",
      "chez pipo",
      "antibes",
      "hotel",
      "airbnb",
      "booking",
      "sas",
      "norwegian",
      "juan les pins",
      "duty-free",
      "a316",
    ],
    category: "reise",
  },
  { keys: ["voi", "dott", "ryde"], category: "sparkesykkel" },
  { keys: ["tensio", "tibber", "gardåveien", "landstads vei"], category: "strom" },
  { keys: ["impulse", "sport", "medlem", "vertical playground"], category: "sport_fritid" },
  { keys: ["vitnett", "neas", "telenor"], category: "tv_media" },
  { keys: ["3t ", "allan magne fallrø"], category: "trening" },
  {
    keys: ["tfl travel", "vy", "ruter", "uber", "bolt", "bensin", "circle k", "shell", "entur web", "atb app"],
    category: "transport",
  },
  { keys: ["espos", "kahoot", "openai", "chatgpt", "pluralsight"], category: "jobb" },
];

const amexRules: Rule[] = [
  {
    keys: ["extra", "joker", "rema", "kiwi", "coop", "bunnpris", "spar", "meny", "obs city lade", "city syd"],
    category: "dagligvarer",
  },
  {
    keys: [
      "8446-v2",
      "pizza",
      "det sorte faar",
      "fox grill",
      "arsenal footbal",
      "hard rock",
      "cafe",
      "espresso",
      "restaurant",
      "nandos",
      "wildwood kitchen",
      "feniqia",
      "amundsen bryggeri",
      "grilleriet",
    ],
    category: "restaurant",
  },
  {
    keys: ["tfl travel", "vy", "ruter", "uber", "bolt", "bensin", "circle k", "shell", "entur web", "atb app"],
    category: "transport",
  },
  {
    keys: [
      "tilburg",
      "trainline",
      "relay 373522 nice",
      "chez pipo",
      "antibes",
      "hotel",
      "airbnb",
      "booking",
      "sas",
      "norwegian",
      "juan les pins",
      "duty-free",
      "a316",
    ],
    category: "reise",
  },
  {
    keys: [
      "resumaker",
      "telenor",
      "ark valentinlyst",
      "apple",
      "aws",
      "disney",
      "strim",
      "prime",
      "spotify",
      "netflix",
      "icloud",
      "tv2",
      "tv 2",
    ],
    category: "tv_media",
  },
  { keys: ["zwift", "spond", "trainerroad"], category: "trening" },
  { keys: ["lyse tele"], category: "mobil" },
  { keys: ["hamleys", "elkjop", "power", "komplett"], category: "elektronikk" },
  { keys: ["apotek", "boots", "legen", "tannlege", "vita2700trondheimt"], category: "helse" },
  {
    keys: [
      "retro",
      "carma",
      "classic footbal",
      "xxl",
      "nike",
      "adidas",
      "zalando",
      "hm",
      "h&m",
      "cubus",
      "lillywhites",
      "mango london",
    ],
    category: "klaer",
  },
  { keys: ["voi", "dott", "ryde"], category: "sparkesykkel" },
  { keys: ["trd olearys", "bakeri", "dromedar", "sprø", "snurr"], category: "kafe" },
  {
    keys: ["bill kill as=trondheim", "ikea", "felleskjoepet", "clas ohlson", "biltema", "bygg", "gjenvinningsstasjon"],
    category: "hus_hjem",
  },
  { keys: ["hyre", "tesla"], category: "bil" },
  { keys: ["espos", "kahoot", "openai", "chatgpt", "pluralsight"], category: "jobb" },
  { keys: ["refund", "reversal", "payment received", "credit", "tilbakeføring", "takk"], category: "innbetaling" },
  { keys: ["polet"], category: "polet" },
  { keys: ["ticketmaster"], category: "konserter" },
  { keys: ["sport", "medlem", "vertical playground"], category: "sport_fritid" },
  { keys: ["fee", "gebyr"], category: "gebyrer" },
  { keys: ["forsikring", "gjensidige", "tryg", "fremtind", "storebrand"], category: "forsikring" },
];

const rulesBySource: Record<TransactionSource, Rule[]> = {
  bank: bankRules,
  amex: amexRules,
  sasmc: amexRules, // placeholder until dedicated rules
  banknorwegian: amexRules, // placeholder until dedicated rules
};

function matchRules(description: string, rules: Rule[]): Category {
  const d = description.toLowerCase();
  for (const rule of rules) {
    if (rule.keys.some((k) => d.includes(k))) {
      return rule.category;
    }
  }
  return "annet";
}

export function categorize(description: string, source: TransactionSource = "bank"): Category {
  return matchRules(description, rulesBySource[source]);
}

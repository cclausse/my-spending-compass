import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev";

// ---- Parser types & interface ----
interface ParsedTransaction {
  booking_date: string; // YYYY-MM-DD
  transaction_date?: string;
  amount: number;
  currency: string;
  description_raw: string;
  merchant?: string;
  category: string;
  account_external_id?: string;
  card_external_id?: string;
}

interface FileParser {
  canParse(content: string, fileName: string): boolean;
  parse(content: string): ParsedTransaction[];
  sourceType: string;
}

// ---- Categorization rules (server-side copy) ----
type Rule = { keys: string[]; category: string };

const bankRules: Rule[] = [
  { keys: ["hyre", "tesla"], category: "bil" },
  { keys: ["flyt", "apcoa", "bom", "vegamot"], category: "bom_parkering" },
  { keys: ["huseiernes", "verisure", "alarmabonnement", "trondheim komm", "oppdal kommune", "kommunale", "vekst oppdal", "remidt", "trh kommune"], category: "bolig_hytte" },
  { keys: ["tobb/bbl finans", "norsk medisinaldepot"], category: "berge_sr" },
  { keys: ["samfunnsviterne", "nito", "leeds"], category: "lag_foreninger" },
  { keys: ["gisle aasgaard", "brage andreas", "egil haave", "ingrid rongved skui", "thea kraugerud tønder", "sverre lo", "marit herrem", "kåre kolve"], category: "eksterne_overforinger" },
  { keys: ["hamleys", "elkjop", "power", "komplett"], category: "elektronikk" },
  { keys: ["forsikring", "fremtind", "storebrand", "gjensidige"], category: "forsikring" },
  { keys: ["varsling", "gebyr", "zolva", "trumfp", "intrum", "kravia", "rente"], category: "gebyrer" },
  { keys: ["dronningens tenner", "apotek", "boots", "legen", "tannlege", "melin collectors", "tannklinikk"], category: "helse" },
  { keys: ["lån", "statens pensjon"], category: "laan" },
  { keys: ["lyse tele"], category: "mobil" },
  { keys: ["credicare", "collectia", "payex"], category: "ikke_bestemt" },
  { keys: ["claussen", "berge", "regninger"], category: "interne_overforinger" },
  { keys: ["ref: 20129268", "refund", "reversal", "payment received", "credit", "tilbakeføring", "takk"], category: "innbetaling" },
  { keys: ["american express", "santander", "sparebank 1 kreditt", "seb kort", "kredittbanken"], category: "kredittkort" },
  { keys: ["hofstad"], category: "kultur" },
  { keys: ["ticketmaster"], category: "konserter" },
  { keys: ["feriekonto sbanken", "sbanken - et konsept fra dnb"], category: "per" },
  { keys: ["polet"], category: "polet" },
  { keys: ["tilburg", "trainline", "hotel", "airbnb", "booking", "sas", "norwegian", "duty-free"], category: "reise" },
  { keys: ["dott", "ryde"], category: "sparkesykkel" },
  { keys: ["tensio", "tibber", "gardåveien", "landstads vei"], category: "strom" },
  { keys: ["impulse", "sport", "medlem", "vertical playground"], category: "sport_fritid" },
  { keys: ["vitnett", "neas", "telenor"], category: "tv_media" },
  { keys: ["invoice", "3t", "allan magne fallrø"], category: "trening" },
  { keys: ["tfl travel", "vy", "ruter", "uber", "bolt", "bensin", "circle k", "shell", "entur web", "atb app"], category: "transport" },
  { keys: ["espos", "kahoot", "openai", "chatgpt", "pluralsight", "fl studio"], category: "jobb" },
];

const amexRules: Rule[] = [
  { keys: ["extra", "joker", "rema", "kiwi", "coop", "bunnpris", "spar", "meny", "obs city lade", "city syd"], category: "dagligvarer" },
  { keys: ["pizza", "det sorte faar", "fox grill", "restaurant", "nandos", "cafe", "espresso", "feniqia", "amundsen bryggeri", "grilleriet"], category: "restaurant" },
  { keys: ["tfl travel", "vy", "ruter", "uber", "bolt", "bensin", "circle k", "shell", "entur web", "atb app"], category: "transport" },
  { keys: ["tilburg", "trainline", "hotel", "airbnb", "booking", "sas", "norwegian", "duty-free", "klm"], category: "reise" },
  { keys: ["telenor", "apple", "aws", "disney", "strim", "prime", "spotify", "netflix", "icloud", "tv2", "tv 2"], category: "tv_media" },
  { keys: ["zwift", "spond", "trainerroad"], category: "trening" },
  { keys: ["lyse tele"], category: "mobil" },
  { keys: ["hamleys", "elkjop", "power", "komplett", "elektroimportoeren"], category: "elektronikk" },
  { keys: ["apotek", "boots", "legen", "tannlege", "tannklinikk"], category: "helse" },
  { keys: ["retro", "carma", "xxl", "nike", "adidas", "zalando", "hm", "h&m", "cubus", "lillywhites", "mango london"], category: "klaer" },
  { keys: ["voi", "dott", "ryde"], category: "sparkesykkel" },
  { keys: ["trd olearys", "bakeri", "dromedar", "sprø", "snurr"], category: "kafe" },
  { keys: ["bill kill as=trondheim", "ikea", "felleskjoepet", "clas ohlson", "biltema", "bygg"], category: "hus_hjem" },
  { keys: ["hyre", "tesla"], category: "bil" },
  { keys: ["espos", "kahoot", "openai", "chatgpt", "pluralsight"], category: "jobb" },
  { keys: ["refund", "reversal", "payment received", "credit", "tilbakeføring", "takk"], category: "innbetaling" },
  { keys: ["polet"], category: "polet" },
  { keys: ["ticketmaster"], category: "konserter" },
  { keys: ["sport", "medlem", "vertical playground"], category: "sport_fritid" },
  { keys: ["fee", "gebyr", "rente"], category: "gebyrer" },
  { keys: ["forsikring", "gjensidige", "tryg", "fremtind", "storebrand"], category: "forsikring" },
];

function categorize(description: string, rules: Rule[]): string {
  const d = description.toLowerCase();
  for (const rule of rules) {
    if (rule.keys.some((k) => d.includes(k))) return rule.category;
  }
  return "annet";
}

// ---- Helpers ----
function parseNorwegianNumber(s: string): number {
  const cleaned = s.replace(/\u2212/g, "-").replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  return parseFloat(cleaned);
}

function stripQuotes(s: string): string {
  return s.replace(/^"(.*)"$/, "$1").trim();
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') inQuotes = !inQuotes;
    else if (char === "," && !inQuotes) { result.push(current); current = ""; }
    else current += char;
  }
  result.push(current);
  return result;
}

function toISODate(d: number, m: number, y: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// ---- Parsers ----
const bankParser: FileParser = {
  sourceType: "bank",
  canParse(content: string, _fileName: string): boolean {
    const first = content.split("\n")[0];
    return first.includes(";") && /Dato/.test(first);
  },
  parse(content: string): ParsedTransaction[] {
    const lines = content.trim().split("\n");
    const txns: ParsedTransaction[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(";").map(stripQuotes);
      if (cols.length < 5) continue;
      const dato = cols[0], beskrivelse = cols[1], inn = cols[3], ut = cols[4];
      if (!dato || !beskrivelse) continue;

      let amount = 0;
      if (inn && inn !== "") amount = parseNorwegianNumber(inn);
      else if (ut && ut !== "") amount = -Math.abs(parseNorwegianNumber(ut));
      if (amount === 0 || isNaN(amount)) continue;

      const [d, m, y] = dato.split(".");
      txns.push({
        booking_date: toISODate(+d, +m, +y),
        amount,
        currency: "NOK",
        description_raw: beskrivelse,
        category: categorize(beskrivelse, bankRules),
        account_external_id: "regningskonto",
      });
    }
    return txns;
  },
};

const amexParser: FileParser = {
  sourceType: "amex",
  canParse(content: string, _fileName: string): boolean {
    const first = content.split("\n")[0];
    return first.includes(",") && /Dato/.test(first);
  },
  parse(content: string): ParsedTransaction[] {
    const lines = content.trim().split("\n");
    const txns: ParsedTransaction[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = parseCSVLine(line);
      if (cols.length < 5) continue;
      const dato = cols[0]?.trim(), beskrivelse = cols[1]?.trim(), belopStr = cols[4]?.trim();
      if (!dato || !beskrivelse || !belopStr) continue;

      const raw = parseNorwegianNumber(belopStr);
      if (isNaN(raw)) continue;
      const amount = raw > 0 ? -raw : Math.abs(raw);

      const [m, d, y] = dato.split("/");
      txns.push({
        booking_date: toISODate(+d, +m, +y),
        amount,
        currency: "NOK",
        description_raw: beskrivelse,
        category: categorize(beskrivelse, amexRules),
        card_external_id: "amex",
      });
    }
    return txns;
  },
};

const parsers: FileParser[] = [bankParser, amexParser];

// ---- Dedup hash ----
async function computeHash(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---- Main handler ----
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { importId } = await req.json();
    if (!importId) {
      return new Response(JSON.stringify({ error: "importId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch import record
    const { data: importRec, error: fetchErr } = await serviceClient
      .from("imports")
      .select("*")
      .eq("id", importId)
      .eq("user_id", userId)
      .single();

    if (fetchErr || !importRec) {
      return new Response(JSON.stringify({ error: "Import not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update status to processing
    await serviceClient.from("imports").update({ status: "processing" }).eq("id", importId);

    // Download file from S3 via signed URL
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const AWS_S3_API_KEY = Deno.env.get("AWS_S3_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!AWS_S3_API_KEY) throw new Error("AWS_S3_API_KEY not configured");

    const signResponse = await fetch(
      `${GATEWAY_URL}/api/v1/sign_storage_url?provider=aws_s3&mode=read`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": AWS_S3_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ object_path: importRec.s3_key }),
      }
    );

    if (!signResponse.ok) {
      const errText = await signResponse.text();
      console.error("S3 sign read error:", signResponse.status, errText);
      await serviceClient.from("imports").update({ status: "failed", error_message: "Could not download file from S3" }).eq("id", importId);
      return new Response(JSON.stringify({ error: "Failed to download file" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { url: downloadUrl } = await signResponse.json();
    const fileResponse = await fetch(downloadUrl);
    if (!fileResponse.ok) {
      await serviceClient.from("imports").update({ status: "failed", error_message: "S3 download failed" }).eq("id", importId);
      return new Response(JSON.stringify({ error: "S3 download failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = await fileResponse.text();

    // Find matching parser
    let matchedParser: FileParser | null = null;
    for (const p of parsers) {
      if (p.canParse(content, importRec.file_name)) {
        matchedParser = p;
        break;
      }
    }

    if (!matchedParser) {
      await serviceClient.from("imports").update({
        status: "failed",
        error_message: "Ukjent filformat – kunne ikke finne passende parser",
      }).eq("id", importId);
      return new Response(JSON.stringify({ error: "No parser found for file" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update source type
    await serviceClient.from("imports").update({ source_type: matchedParser.sourceType }).eq("id", importId);

    // Parse
    let parsed: ParsedTransaction[];
    try {
      parsed = matchedParser.parse(content);
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : "Parse error";
      await serviceClient.from("imports").update({ status: "failed", error_message: msg }).eq("id", importId);
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (parsed.length === 0) {
      await serviceClient.from("imports").update({
        status: "failed",
        error_message: "Ingen transaksjoner funnet i filen",
      }).eq("id", importId);
      return new Response(JSON.stringify({ error: "No transactions found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build transaction rows with dedup hash
    const rows = [];
    for (const t of parsed) {
      const hashInput = `${t.booking_date}|${t.amount}|${t.description_raw}|${t.account_external_id || ""}|${t.card_external_id || ""}`;
      const hash = await computeHash(hashInput);
      rows.push({
        user_id: userId,
        import_id: importId,
        booking_date: t.booking_date,
        transaction_date: t.transaction_date || null,
        amount: t.amount,
        currency: t.currency,
        description_raw: t.description_raw,
        merchant: t.merchant || null,
        category: t.category,
        account_external_id: t.account_external_id || null,
        card_external_id: t.card_external_id || null,
        dedup_hash: hash,
      });
    }

    // Insert with ON CONFLICT skip for dedup
    const { data: inserted, error: insertErr } = await serviceClient
      .from("transactions")
      .upsert(rows, { onConflict: "user_id,dedup_hash", ignoreDuplicates: true })
      .select("id");

    const insertedCount = inserted?.length ?? 0;

    await serviceClient.from("imports").update({
      status: "parsed",
      transaction_count: insertedCount,
    }).eq("id", importId);

    return new Response(
      JSON.stringify({
        status: "parsed",
        totalParsed: parsed.length,
        insertedCount,
        duplicatesSkipped: parsed.length - insertedCount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Process import error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

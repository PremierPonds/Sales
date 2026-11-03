// Geography, keyword, and address rules for Premier Ponds lead search.
// Code owns these gates so a model turn cannot widen the map or invent a street.

export const FEATURE_PHRASES = [
  "pondless waterfall",
  "recirculating stream",
  "reflecting pool",
  "water feature",
  "water garden",
  "backyard pond",
  "garden pond",
  "fish pond",
  "lily pond",
  "koi pond",
  "koi fish",
  "babbling brook",
  "waterfall",
  "koi",
  "pond",
] as const;

const NORTHERN_VIRGINIA_PLACES = new Set([
  "alexandria",
  "arlington",
  "falls church",
  "fairfax",
  "fairfax station",
  "burke",
  "annandale",
  "springfield",
  "west springfield",
  "mclean",
  "vienna",
  "oakton",
  "great falls",
  "herndon",
  "reston",
  "chantilly",
  "centreville",
  "clifton",
  "lorton",
  "franconia",
  "kingstowne",
  "dunn loring",
  "merrifield",
  "tysons",
  "tysons corner",
  "fort belvoir",
  "newington",
  "mount vernon",
  "belle haven",
  "huntington",
  "leesburg",
  "ashburn",
  "sterling",
  "purcellville",
  "middleburg",
  "lovettsville",
  "round hill",
  "hamilton",
  "hillsboro",
  "aldie",
  "south riding",
  "brambleton",
  "broadlands",
  "lansdowne",
  "stone ridge",
  "potomac falls",
  "cascades",
  "countryside",
  "manassas",
  "manassas park",
  "woodbridge",
  "dale city",
  "lake ridge",
  "gainesville",
  "haymarket",
  "nokesville",
  "dumfries",
  "occoquan",
  "quantico",
  "bristow",
  "catharpin",
  "triangle",
  "montclair",
  "yorkshire",
  "fairfax county",
  "loudoun county",
  "prince william county",
  "arlington county",
]);

// Loudoun, western Fairfax, and Prince William ZIPs that sit in 201xx.
const NOVA_201_ZIPS = new Set([
  "20105",
  "20109",
  "20110",
  "20111",
  "20112",
  "20117",
  "20120",
  "20121",
  "20124",
  "20129",
  "20132",
  "20135",
  "20136",
  "20141",
  "20143",
  "20147",
  "20148",
  "20151",
  "20152",
  "20155",
  "20158",
  "20164",
  "20165",
  "20166",
  "20169",
  "20170",
  "20171",
  "20175",
  "20176",
  "20180",
  "20181",
  "20190",
  "20191",
  "20194",
  "20197",
]);

// Western Maryland panhandle (Garrett, Allegany, Washington) and St. Mary's County.
const EXCLUDED_MD_PLACES = new Set([
  "hagerstown",
  "boonsboro",
  "smithsburg",
  "hancock",
  "funkstown",
  "clear spring",
  "williamsport",
  "sharpsburg",
  "keedysville",
  "fairplay",
  "knoxville",
  "rohrersville",
  "cumberland",
  "frostburg",
  "lonaconing",
  "westernport",
  "luke",
  "barton",
  "midland",
  "mount savage",
  "lavale",
  "flintstone",
  "oldtown",
  "rawlings",
  "oakland",
  "mountain lake park",
  "grantsville",
  "accident",
  "friendsville",
  "loch lynn heights",
  "swanton",
  "mchenry",
  "deer park",
  "leonardtown",
  "lexington park",
  "california",
  "mechanicsville",
  "hollywood",
  "great mills",
  "callaway",
  "ridge",
  "charlotte hall",
  "valley lee",
  "chaptico",
  "loveville",
  "coltons point",
  "dameron",
  "park hall",
  "saint inigoes",
  "st inigoes",
  "piney point",
  "tall timbers",
  "bushwood",
  "clements",
  "morganza",
]);

const EXCLUDED_MD_ZIPS = new Set([
  "20606",
  "20609",
  "20618",
  "20619",
  "20620",
  "20621",
  "20626",
  "20628",
  "20630",
  "20632",
  "20634",
  "20636",
  "20645",
  "20650",
  "20653",
  "20659",
  "20660",
  "20667",
  "20670",
  "20674",
  "20676",
  "20684",
  "20686",
  "20687",
  "20688",
  "20690",
  "20692",
  "21711",
  "21713",
  "21722",
  "21733",
  "21734",
  "21740",
  "21741",
  "21742",
  "21746",
  "21749",
  "21750",
  "21756",
  "21767",
  "21779",
  "21780",
  "21781",
  "21782",
  "21783",
  "21795",
]);

const EXCLUDED_MD_COUNTY =
  /\b(st\.?\s*mary'?s county|saint mary'?s county|washington county|allegany county|garrett county)\b/i;

const STREET_SUFFIX =
  "Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Court|Ct|Circle|Cir|Boulevard|Blvd|Way|Place|Pl|Terrace|Ter|Trail|Trl|Parkway|Pkwy|Highway|Hwy|Pike|Run|Loop|Path";

const TEXT_ADDRESS = new RegExp(
  String.raw`\b(\d{1,6}\s+(?:[A-Za-z0-9.'#]+\s+){0,7}(?:${STREET_SUFFIX}))\b\.?,?\s+([A-Za-z][A-Za-z .'-]*?),\s*(VA|MD)\s+(\d{5})\b`,
  "i",
);

const SUFFIX_TOKENS = new Set([
  "st",
  "street",
  "ave",
  "avenue",
  "rd",
  "road",
  "dr",
  "drive",
  "ln",
  "lane",
  "ct",
  "court",
  "cir",
  "circle",
  "blvd",
  "boulevard",
  "way",
  "pl",
  "place",
  "ter",
  "terrace",
  "trl",
  "trail",
  "pkwy",
  "parkway",
  "hwy",
  "highway",
  "pike",
  "run",
  "loop",
  "path",
]);

export type ParsedAddress = {
  address: string;
  city: string;
  state: "VA" | "MD";
  zip: string;
};

export function normalizePlace(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isNorthernVirginiaZip(zip: string): boolean {
  return /^22[0-3]\d{2}$/.test(zip) || NOVA_201_ZIPS.has(zip);
}

export function inServiceArea(input: {
  city: string;
  state: string;
  zip: string;
  text?: string;
}): boolean {
  const state = input.state.toUpperCase();
  const city = normalizePlace(input.city);
  const zip = input.zip.trim();
  if (!/^\d{5}$/.test(zip) || !city) return false;
  if (state === "VA") {
    return NORTHERN_VIRGINIA_PLACES.has(city) || isNorthernVirginiaZip(zip);
  }
  if (state !== "MD") return false;
  if (EXCLUDED_MD_PLACES.has(city)) return false;
  if (EXCLUDED_MD_ZIPS.has(zip) || zip.startsWith("215")) return false;
  if (input.text && EXCLUDED_MD_COUNTY.test(input.text)) return false;
  return true;
}

function phrasePattern(phrase: string): RegExp {
  const body = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(String.raw`\b${body}\b`, "i");
}

export function matchKeywords(text: string): string[] {
  const found = FEATURE_PHRASES.filter((phrase) => phrasePattern(phrase).test(text));
  const specific = found.filter(
    (phrase) => !found.some((other) => other !== phrase && other.includes(phrase)),
  );
  if (specific.length === 1 && specific[0] === "pond" && !hasMaintainablePond(text)) {
    return [];
  }
  return [...specific];
}

function hasMaintainablePond(text: string): boolean {
  const cleaned = text
    .replace(/\b(retention|detention|stormwater|storm water|infiltration)\s+ponds?\b/gi, " ")
    .replace(/\b(community|neighborhood|hoa)\s+ponds?\b/gi, " ")
    .replace(
      /\bponds?\s+(road|rd|lane|ln|drive|dr|street|st|avenue|ave|court|ct|circle|cir|way|place|pl|trail|trl|parkway|pkwy)\b/gi,
      " ",
    );
  return /\bponds?\b/i.test(cleaned);
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) =>
      /^\d/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join(" ");
}

function fromStreetSlug(house: string, slug: string): ParsedAddress | undefined {
  const tokens = slug.split("-").filter(Boolean);
  let suffixAt = -1;
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    if (SUFFIX_TOKENS.has(tokens[i].toLowerCase())) {
      suffixAt = i;
      break;
    }
  }
  if (suffixAt < 0 || suffixAt === tokens.length - 1) return undefined;
  const street = titleCase([house, ...tokens.slice(0, suffixAt + 1)].join(" "));
  const city = titleCase(tokens.slice(suffixAt + 1).join(" "));
  if (!street || !city) return undefined;
  return { address: street, city, state: "VA", zip: "" };
}

export function parseAddressFromUrl(url: string): ParsedAddress | undefined {
  const redfin = url.match(
    /redfin\.com\/(VA|MD)\/([^/?#]+)\/(\d{1,6})-([A-Za-z0-9-]+)-(\d{5})\/home\/\d+/i,
  );
  if (redfin) {
    return {
      address: titleCase(`${redfin[3]} ${redfin[4].replace(/-/g, " ")}`),
      city: titleCase(redfin[2].replace(/-/g, " ")),
      state: redfin[1].toUpperCase() as "VA" | "MD",
      zip: redfin[5],
    };
  }

  const zillow = url.match(/homedetails\/(\d{1,6})-([A-Za-z0-9-]+)-(VA|MD)-(\d{5})(?:\/|$)/i);
  if (zillow) {
    const parsed = fromStreetSlug(zillow[1], zillow[2]);
    if (!parsed) return undefined;
    return {
      ...parsed,
      state: zillow[3].toUpperCase() as "VA" | "MD",
      zip: zillow[4],
    };
  }

  const realtor = url.match(
    /realestateandhomes-detail\/(\d{1,6}-[^_]+)_([^_]+)_([A-Z]{2})_(\d{5})/i,
  );
  if (realtor && (realtor[3].toUpperCase() === "VA" || realtor[3].toUpperCase() === "MD")) {
    return {
      address: titleCase(realtor[1].replace(/-/g, " ")),
      city: titleCase(realtor[2].replace(/-/g, " ")),
      state: realtor[3].toUpperCase() as "VA" | "MD",
      zip: realtor[4],
    };
  }
  return undefined;
}

export function parseAddressFromText(text: string): ParsedAddress | undefined {
  const match = text.match(TEXT_ADDRESS);
  if (!match) return undefined;
  const state = match[3].toUpperCase();
  if (state !== "VA" && state !== "MD") return undefined;
  return {
    address: match[1].replace(/\s+/g, " ").trim(),
    city: match[2].replace(/\s+/g, " ").trim(),
    state,
    zip: match[4],
  };
}

export function parseAddress(url: string, text: string): ParsedAddress | undefined {
  const fromText = parseAddressFromText(text);
  const fromUrl = parseAddressFromUrl(url);
  if (fromText && fromUrl) {
    return fromText.zip === fromUrl.zip ? fromText : fromUrl;
  }
  return fromText ?? fromUrl;
}

export function isDetailListingUrl(url: string): boolean {
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return false;
  }
  const allowed = ["zillow.com", "redfin.com", "realtor.com", "homes.com"].some(
    (name) => host === name || host.endsWith(`.${name}`),
  );
  if (!allowed) return false;
  if (/\/(amenity|city|county|zipcode|neighborhood|schools?)\//i.test(url)) return false;
  if (host.endsWith("redfin.com")) return /\/home\/\d+/.test(url);
  if (host.endsWith("zillow.com")) return /\/homedetails\//.test(url);
  if (host.endsWith("realtor.com")) return /realestateandhomes-detail\//.test(url);
  return /\/\d{1,6}-/.test(url);
}

export function sourceFromUrl(url: string): string {
  const host = url.toLowerCase();
  if (host.includes("zillow.com")) return "zillow";
  if (host.includes("redfin.com")) return "redfin";
  if (host.includes("realtor.com")) return "realtor";
  if (host.includes("homes.com")) return "homes";
  return "other";
}

export type SkipReason = "notListing" | "noAddress" | "outOfArea" | "noKeyword";

export type Candidate = ParsedAddress & {
  keywords: string[];
  source: string;
  url: string;
};

export function considerHit(hit: {
  title: string;
  url: string;
  snippet: string;
}): { ok: true; candidate: Candidate } | { ok: false; reason: SkipReason } {
  if (!isDetailListingUrl(hit.url)) return { ok: false, reason: "notListing" };
  const text = `${hit.title} ${hit.snippet}`;
  const parsed = parseAddress(hit.url, text);
  if (!parsed) return { ok: false, reason: "noAddress" };
  if (!inServiceArea({ ...parsed, text })) return { ok: false, reason: "outOfArea" };
  const keywords = matchKeywords(text);
  if (keywords.length === 0) return { ok: false, reason: "noKeyword" };
  return {
    ok: true,
    candidate: { ...parsed, keywords, source: sourceFromUrl(hit.url), url: hit.url },
  };
}

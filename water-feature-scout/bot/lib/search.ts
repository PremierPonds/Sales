// Public web-search snippets only. This module does not request
// Zillow, Redfin, Realtor, or Homes.com pages.

export type SearchHit = {
  title: string;
  url: string;
  snippet: string;
};

export type PlaceCluster = {
  state: "VA" | "MD";
  places: string[];
};

export const PLACE_CLUSTERS: PlaceCluster[] = [
  { state: "VA", places: ["Alexandria", "Arlington"] },
  { state: "VA", places: ["Falls Church", "McLean", "Vienna", "Great Falls"] },
  { state: "VA", places: ["Fairfax", "Burke", "Springfield", "Annandale"] },
  { state: "VA", places: ["Reston", "Herndon", "Chantilly", "Centreville"] },
  { state: "VA", places: ["Leesburg", "Ashburn", "Sterling", "Purcellville"] },
  { state: "VA", places: ["Woodbridge", "Manassas", "Gainesville", "Haymarket"] },
  { state: "MD", places: ["Bethesda", "Potomac", "Rockville", "Chevy Chase"] },
  { state: "MD", places: ["Silver Spring", "Gaithersburg", "Germantown", "Olney"] },
  { state: "MD", places: ["Bowie", "Laurel", "College Park", "Hyattsville"] },
  { state: "MD", places: ["Columbia", "Ellicott City", "Annapolis", "Severna Park"] },
  { state: "MD", places: ["Frederick", "Urbana", "Brunswick"] },
  { state: "MD", places: ["Baltimore", "Towson", "Catonsville", "Pikesville"] },
  { state: "MD", places: ["Bel Air", "Westminster", "Elkton", "Havre de Grace"] },
  { state: "MD", places: ["Waldorf", "La Plata", "Prince Frederick", "Dunkirk"] },
  { state: "MD", places: ["Easton", "Salisbury", "Ocean City", "Cambridge"] },
];

export const SEARCH_PHRASES = ["koi pond", "waterfall", "water feature", "backyard pond"];

export function buildQueries(status: "active" | "sold"): string[] {
  const sold = status === "sold" ? " sold" : "";
  const queries: string[] = [];
  for (const phrase of SEARCH_PHRASES) {
    for (const cluster of PLACE_CLUSTERS) {
      for (const place of cluster.places) {
        queries.push(`"${phrase}" "${place}" ${cluster.state}${sold}`);
      }
    }
  }
  return queries;
}

export function placeCount(): number {
  return PLACE_CLUSTERS.reduce((total, cluster) => total + cluster.places.length, 0);
}

export function sliceQueries(queries: string[], start: number, maxQueries: number): string[] {
  if (queries.length === 0 || maxQueries <= 0) return [];
  const count = Math.min(maxQueries, queries.length);
  const origin = ((start % queries.length) + queries.length) % queries.length;
  return Array.from({ length: count }, (_, index) => queries[(origin + index) % queries.length]);
}

export function parseDuckDuckGoHtml(html: string): SearchHit[] {
  const parts = html.split(/class="result results_links/);
  const hits: SearchHit[] = [];
  for (const part of parts.slice(1)) {
    const link = part.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const snippet = part.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|td|div|span)>/i);
    const url = decodeDuckDuckGoUrl(decodeHtml(link[1]));
    if (!url.startsWith("http")) continue;
    hits.push({
      title: decodeHtml(link[2]),
      url,
      snippet: snippet ? decodeHtml(snippet[1]) : "",
    });
  }
  return hits;
}

export function decodeDuckDuckGoUrl(href: string): string {
  const match = href.match(/[?&]uddg=([^&]+)/);
  if (!match) return href;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return href;
  }
}

function decodeHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

const REFUSED =
  "Public search refused the request. Set BRAVE_SEARCH_API_KEY and run the scan again.";

export function searchProvider(): "brave" | "duckduckgo" {
  return braveKey() ? "brave" : "duckduckgo";
}

export function searchGapMs(): number {
  return braveKey() ? 300 : 1200;
}

export async function searchWeb(query: string): Promise<SearchHit[]> {
  const key = braveKey();
  if (key) return searchBrave(query, key);
  return searchDuckDuckGo(query);
}

function braveKey(): string {
  return process.env.BRAVE_SEARCH_API_KEY?.trim() ?? "";
}

async function searchBrave(query: string, key: string): Promise<SearchHit[]> {
  const url = `https://api.search.brave.com/res/v1/web/search?${new URLSearchParams({
    q: query,
    count: "10",
  })}`;
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "x-subscription-token": key,
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (response.status === 401 || response.status === 403) {
    throw new Error("Brave Search rejected BRAVE_SEARCH_API_KEY.");
  }
  if (!response.ok) throw new Error(`Brave Search failed with HTTP ${response.status}`);
  const body = (await response.json()) as {
    web?: { results?: Array<{ title?: string; url?: string; description?: string }> };
  };
  return (body.web?.results ?? []).flatMap((item) => {
    if (!item.url || !item.title) return [];
    return [{ title: item.title, url: item.url, snippet: item.description ?? "" }];
  });
}

export async function searchDuckDuckGo(query: string): Promise<SearchHit[]> {
  const url = `https://html.duckduckgo.com/html/?${new URLSearchParams({ q: query })}`;
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      accept: "text/html",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (response.status === 202 || response.status === 403 || response.status >= 400) {
    throw new Error(REFUSED);
  }
  const html = await response.text();
  const hits = parseDuckDuckGoHtml(html);
  if (hits.length === 0 && /unfortunately,\s+bots/i.test(html)) throw new Error(REFUSED);
  return hits;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

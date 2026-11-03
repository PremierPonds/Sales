import { writeFileSync } from "node:fs";
import { buildWorkbook, listingKey, mergeListings, type Listing } from "./catalog.js";
import { considerHit, inServiceArea, matchKeywords, parseAddressFromUrl } from "./match.js";
import { buildQueries, parseDuckDuckGoHtml, placeCount, sliceQueries } from "./search.js";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const leesburg = parseAddressFromUrl(
  "https://www.redfin.com/VA/Leesburg/40903-Grenata-Preserve-Pl-20175/home/12102710",
);
assert(leesburg?.address === "40903 Grenata Preserve Pl", "redfin street");
assert(leesburg?.city === "Leesburg", "redfin city");
assert(leesburg?.state === "VA" && leesburg.zip === "20175", "redfin state zip");

const zillow = parseAddressFromUrl(
  "https://www.zillow.com/homedetails/12134-Holly-Knoll-Cir-Great-Falls-VA-22066/999_zpid/",
);
assert(zillow?.city === "Great Falls", `zillow city ${zillow?.city}`);
assert(zillow?.address === "12134 Holly Knoll Cir", `zillow street ${zillow?.address}`);
assert(zillow?.zip === "22066", "zillow zip");

assert(
  matchKeywords("Elegantly appointed estate with a koi pond and waterfall.").join("|") ===
    "koi pond|waterfall",
  "specific keywords",
);
assert(matchKeywords("Charming home on Pond Lane.").length === 0, "street pond rejected");
assert(matchKeywords("A stormwater pond sits behind the house.").length === 0, "stormwater rejected");
assert(matchKeywords("Private backyard pond with lilies.").join("|") === "backyard pond", "backyard pond");

assert(inServiceArea({ city: "Leesburg", state: "VA", zip: "20175" }), "leesburg in");
assert(inServiceArea({ city: "Great Falls", state: "VA", zip: "22066" }), "great falls in");
assert(!inServiceArea({ city: "Richmond", state: "VA", zip: "23220" }), "richmond out");
assert(inServiceArea({ city: "Bethesda", state: "MD", zip: "20814" }), "bethesda in");
assert(!inServiceArea({ city: "Hagerstown", state: "MD", zip: "21740" }), "hagerstown out");
assert(!inServiceArea({ city: "California", state: "MD", zip: "20619" }), "st marys out");
assert(!inServiceArea({ city: "Leonardtown", state: "MD", zip: "20650" }), "leonardtown out");
assert(
  !inServiceArea({
    city: "Frederick",
    state: "MD",
    zip: "21701",
    text: "Near the Washington County line",
  }),
  "county phrase out",
);
assert(inServiceArea({ city: "Frederick", state: "MD", zip: "21701" }), "frederick in");

const hit = considerHit({
  title: "40903 Grenata Preserve Pl, Leesburg, VA 20175 | Redfin",
  url: "https://www.redfin.com/VA/Leesburg/40903-Grenata-Preserve-Pl-20175/home/12102710",
  snippet: "Extensive hardscape including a koi pond and waterfall.",
});
assert(hit.ok, "leesburg hit kept");

const amenity = considerHit({
  title: "Koi Pond - Woodbridge, VA Homes for Sale | Redfin",
  url: "https://www.redfin.com/city/26845/VA/Woodbridge/amenity/koi+pond",
  snippet: "Koi pond homes for sale.",
});
assert(!amenity.ok && amenity.reason === "notListing", "amenity page skipped");

const richmond = considerHit({
  title: "10 Main St, Richmond, VA 23220 | Redfin",
  url: "https://www.redfin.com/VA/Richmond/10-Main-St-23220/home/55",
  snippet: "A koi pond in the garden.",
});
assert(!richmond.ok && richmond.reason === "outOfArea", "richmond skipped");

const now = "2026-01-15T17:00:00.000Z";
const row = (patch: Partial<Listing>): Listing => ({
  address: "40903 Grenata Preserve Pl",
  city: "Leesburg",
  state: "VA",
  zip: "20175",
  keywords: ["koi pond"],
  status: "active",
  source: "redfin",
  url: "https://www.redfin.com/example",
  firstSeen: now,
  lastSeen: now,
  ...patch,
});
const first = mergeListings([], [row({})]);
const second = mergeListings(first.listings, [
  row({ keywords: ["waterfall"], status: "sold", source: "zillow", lastSeen: "2026-02-01T17:00:00.000Z" }),
]);
assert(second.added === 0 && second.updated === 1, "duplicate merged");
assert(second.listings.length === 1, "one row");
assert(second.listings[0].keywords.join("|") === "waterfall|koi pond", second.listings[0].keywords.join("|"));
assert(second.listings[0].status === "sold", "latest status");
assert(second.listings[0].source === "redfin; zillow", second.listings[0].source);
assert(
  listingKey(row({ address: "40903 Grenata Preserve Place" })) === listingKey(row({})),
  "place and pl share a key",
);

const queries = buildQueries("active");
assert(queries.length === placeCount() * 4, `query count ${queries.length}`);
assert(queries[0] === '"koi pond" "Alexandria" VA', queries[0]);
assert(queries.some((query) => query.includes("sold")) === false, "active queries omit sold");
assert(buildQueries("sold").every((query) => query.includes(" sold")), "sold queries");
const page = sliceQueries(queries, queries.length - 5, 10);
assert(page.length === 10, "slice length");
assert(page[0] === queries[queries.length - 5], "slice start");
assert(page[5] === queries[0], "slice wraps");

const html = `
<div class="result results_links results_links_deep web-result ">
  <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.redfin.com%2FVA%2FLeesburg%2F1-Main-St-20175%2Fhome%2F9">1 Main St</a>
  <a class="result__snippet">A koi pond.</a>
</div>`;
const parsed = parseDuckDuckGoHtml(html);
assert(parsed.length === 1, "ddg parse count");
assert(parsed[0].url === "https://www.redfin.com/VA/Leesburg/1-Main-St-20175/home/9", parsed[0].url);
assert(parsed[0].snippet === "A koi pond.", parsed[0].snippet);

const workbook = buildWorkbook(second.listings, [
  { at: now, status: "active", queriesRun: 1, kept: 1, added: 1, updated: 0, note: "ok" },
]);
assert(Buffer.from(workbook).includes(Buffer.from("Keyword Matched")), "xlsx header");
assert(Buffer.from(workbook).includes(Buffer.from("40903 Grenata Preserve Pl")), "xlsx address");
writeFileSync("/tmp/water-feature-scout.xlsx", workbook);

console.log("self-check ok");

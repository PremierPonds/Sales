import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { mergeListings, type Listing } from "../lib/catalog.js";
import { inServiceArea, matchKeywords } from "../lib/match.js";
import { readCatalog, writeCatalog, writeWorkbook } from "../lib/store.js";

const Row = z.object({
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.enum(["VA", "MD", "va", "md"]),
  zip: z.string().regex(/^\d{5}$/),
  text: z.string().min(1),
  status: z.enum(["active", "sold"]),
  source: z.string().optional(),
  url: z.string().optional(),
});

export default defineTool({
  description: prompt`
    Save homes the user already pasted. Each row needs a street address
    and the listing text that names the water feature. Duplicate addresses
    merge into the existing workbook row.
  `,
  inputSchema: z.object({
    listings: z.array(Row).min(1).max(40),
  }),
  effect: "write",
  dryRunResult: () => ({ dryRun: true, added: 0, updated: 0, rejected: 0, total: 0 }),
  async execute({ listings }, ctx) {
    const now = ctx.now().toISOString();
    const catalog = await readCatalog(ctx.host.kv);
    const incoming: Listing[] = [];
    const rejected: Array<{ address: string; reason: string }> = [];
    for (const row of listings) {
      const state = row.state.toUpperCase() as "VA" | "MD";
      const keywords = matchKeywords(row.text);
      if (!inServiceArea({ city: row.city, state, zip: row.zip, text: row.text })) {
        rejected.push({ address: row.address, reason: "Outside the service area." });
        continue;
      }
      if (keywords.length === 0) {
        rejected.push({ address: row.address, reason: "No maintainable water-feature keyword." });
        continue;
      }
      incoming.push({
        address: row.address.replace(/\s+/g, " ").trim(),
        city: row.city.replace(/\s+/g, " ").trim(),
        state,
        zip: row.zip,
        keywords,
        status: row.status,
        source: row.source?.trim() || "manual",
        url: row.url?.trim() || "",
        firstSeen: now,
        lastSeen: now,
      });
    }
    const merged = mergeListings(catalog.listings, incoming);
    const runs = catalog.runs;
    await writeCatalog(ctx.host.kv, { listings: merged.listings, runs });
    await writeWorkbook(ctx.host.files, merged.listings, runs);
    return {
      added: merged.added,
      updated: merged.updated,
      rejected,
      total: merged.listings.length,
      workbook: "listings.xlsx",
    };
  },
});

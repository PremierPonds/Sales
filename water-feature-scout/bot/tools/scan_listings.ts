import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { buildWorkbook, mergeListings, type Listing } from "../lib/catalog.js";
import { considerHit } from "../lib/match.js";
import {
  buildQueries,
  placeCount,
  searchGapMs,
  searchProvider,
  searchWeb,
  sliceQueries,
  sleep,
  type SearchHit,
} from "../lib/search.js";
import {
  readCatalog,
  readCursor,
  WORKBOOK_PATH,
  writeCatalog,
  writeCursor,
} from "../lib/store.js";

const Hit = z.object({
  title: z.string(),
  url: z.string(),
  snippet: z.string(),
});

const WEEKLY_QUERY_BUDGET = 20;

export default defineTool({
  description: prompt`
    Search public web results for Northern Virginia and Maryland homes
    with a maintainable water feature. Merges matches into the saved
    workbook. Use status "active" for current listings and "sold" for
    sold listings. Do not use this to open Zillow, Redfin, or Realtor.
  `,
  inputSchema: z.object({
    status: z.enum(["active", "sold"]),
    maxQueries: z.number().int().min(1).max(80).optional(),
    fixtureHits: z.array(Hit).max(40).optional(),
  }),
  effect: "write",
  dryRunResult: ({ status }) => ({
    status,
    dryRun: true,
    queriesRun: 0,
    kept: 0,
    added: 0,
    updated: 0,
    total: 0,
  }),
  async execute({ status, maxQueries, fixtureHits }, ctx) {
    const now = ctx.now().toISOString();
    const catalog = await readCatalog(ctx.host.kv);
    const skips = { notListing: 0, noAddress: 0, outOfArea: 0, noKeyword: 0 };
    let queriesRun = 0;
    let note = "";
    const hits: SearchHit[] = [];

    if (fixtureHits) {
      hits.push(...fixtureHits);
      note = "Fixture hits. No web search.";
    } else {
      const queries = buildQueries(status);
      const budget = Math.min(maxQueries ?? WEEKLY_QUERY_BUDGET, queries.length);
      const start = await readCursor(ctx.host.kv, status);
      const selected = sliceQueries(queries, start, budget);
      for (const query of selected) {
        try {
          hits.push(...(await searchWeb(query)));
        } catch (error) {
          note = error instanceof Error ? error.message : "Search failed.";
          break;
        }
        queriesRun += 1;
        await sleep(searchGapMs());
      }
      await writeCursor(
        ctx.host.kv,
        status,
        (start + queriesRun) % Math.max(queries.length, 1),
      );
      if (!note) {
        note = `Searched ${queriesRun} of ${queries.length} ${searchProvider()} queries. One full pass is ${placeCount()} cities for one phrase.`;
      }
    }

    const incoming: Listing[] = [];
    for (const hit of hits) {
      const decision = considerHit(hit);
      if (!decision.ok) {
        skips[decision.reason] += 1;
        continue;
      }
      incoming.push({ ...decision.candidate, status, firstSeen: now, lastSeen: now });
    }
    const merged = mergeListings(catalog.listings, incoming);
    const run = {
      at: now,
      status,
      queriesRun,
      kept: incoming.length,
      added: merged.added,
      updated: merged.updated,
      note,
    };
    const runs = [...catalog.runs, run];
    await writeCatalog(ctx.host.kv, { listings: merged.listings, runs });
    let workbookError = "";
    try {
      const bytes = buildWorkbook(merged.listings, runs);
      await ctx.host.files.write(WORKBOOK_PATH, bytes, { scope: "deployment" });
      await ctx.artifacts.tag({
        kind: "water-feature-workbook",
        key: WORKBOOK_PATH,
        title: "Water feature listings",
        data: { rowCount: merged.listings.length, updatedAt: now },
        contents: bytes,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    } catch (error) {
      workbookError = error instanceof Error ? error.message : "Workbook write failed.";
    }

    return {
      status,
      provider: fixtureHits ? "fixture" : searchProvider(),
      queriesRun,
      rawHits: hits.length,
      kept: incoming.length,
      added: merged.added,
      updated: merged.updated,
      total: merged.listings.length,
      skipped: skips,
      workbook: "listings.xlsx",
      workbookError,
      note,
      sample: merged.listings.slice(0, 8).map((row) => ({
        address: row.address,
        city: row.city,
        state: row.state,
        zip: row.zip,
        keywordMatched: row.keywords.join("; "),
        status: row.status,
      })),
    };
  },
});

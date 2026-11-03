import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { formatEastern } from "../lib/catalog.js";
import { readCatalog } from "../lib/store.js";

export default defineTool({
  description: prompt`
    Read the saved water-feature catalog. Use this to answer questions
    about homes already found. It does not search the web.
  `,
  inputSchema: z.object({
    status: z.enum(["active", "sold"]).optional(),
    state: z.enum(["VA", "MD"]).optional(),
    keyword: z.string().optional(),
    limit: z.number().int().min(1).max(200).optional(),
  }),
  effect: "read",
  async execute({ status, state, keyword, limit }, ctx) {
    const catalog = await readCatalog(ctx.host.kv);
    const needle = keyword?.toLowerCase().trim();
    const rows = catalog.listings.filter((row) => {
      if (status && row.status !== status) return false;
      if (state && row.state !== state) return false;
      if (needle && !row.keywords.some((item) => item.includes(needle))) return false;
      return true;
    });
    const cap = limit ?? 50;
    return {
      total: rows.length,
      shown: Math.min(rows.length, cap),
      workbook: "listings.xlsx",
      listings: rows.slice(0, cap).map((row) => ({
        address: row.address,
        city: row.city,
        state: row.state,
        zip: row.zip,
        keywordMatched: row.keywords.join("; "),
        status: row.status,
        source: row.source,
        url: row.url,
        firstSeen: formatEastern(row.firstSeen),
        lastSeen: formatEastern(row.lastSeen),
      })),
    };
  },
});

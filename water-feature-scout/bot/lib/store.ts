import type { HostFilesApi, HostKvApi, JsonValue } from "@grok/agent-sdk";
import { buildWorkbook, emptyCatalog, type Catalog, type Listing, type RunRecord } from "./catalog.js";

export const CATALOG_KEY = "catalog:v1";
export const WORKBOOK_PATH = "listings.xlsx";
const RUN_LIMIT = 52;

export async function readCatalog(kv: HostKvApi): Promise<Catalog> {
  const raw = await kv.get(CATALOG_KEY);
  return parseCatalog(raw);
}

export async function writeCatalog(kv: HostKvApi, catalog: Catalog): Promise<void> {
  const runs = catalog.runs.slice(-RUN_LIMIT);
  await kv.put(CATALOG_KEY, { listings: catalog.listings, runs });
}

export async function readCursor(kv: HostKvApi, status: "active" | "sold"): Promise<number> {
  const raw = await kv.get(`cursor:${status}`);
  return typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
}

export async function writeCursor(
  kv: HostKvApi,
  status: "active" | "sold",
  value: number,
): Promise<void> {
  await kv.put(`cursor:${status}`, value);
}

export async function writeWorkbook(
  files: HostFilesApi,
  listings: Listing[],
  runs: RunRecord[],
): Promise<void> {
  await files.write(WORKBOOK_PATH, buildWorkbook(listings, runs), { scope: "deployment" });
}

function parseCatalog(raw: JsonValue | undefined): Catalog {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return emptyCatalog();
  const listings = Array.isArray(raw.listings) ? raw.listings.flatMap(parseListing) : [];
  const runs = Array.isArray(raw.runs) ? raw.runs.flatMap(parseRun) : [];
  return { listings, runs };
}

function parseListing(value: JsonValue): Listing[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const address = str(value.address);
  const city = str(value.city);
  const state = str(value.state);
  const zip = str(value.zip);
  const status = str(value.status);
  const source = str(value.source);
  const url = str(value.url);
  const firstSeen = str(value.firstSeen);
  const lastSeen = str(value.lastSeen);
  const keywords = Array.isArray(value.keywords) ? value.keywords.filter((item) => typeof item === "string") : [];
  if (!address || !city || (state !== "VA" && state !== "MD") || !/^\d{5}$/.test(zip)) return [];
  if (status !== "active" && status !== "sold") return [];
  if (!firstSeen || !lastSeen || keywords.length === 0) return [];
  return [{ address, city, state, zip, keywords, status, source, url, firstSeen, lastSeen }];
}

function parseRun(value: JsonValue): RunRecord[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const at = str(value.at);
  const status = str(value.status);
  if (!at || (status !== "active" && status !== "sold")) return [];
  return [
    {
      at,
      status,
      queriesRun: num(value.queriesRun),
      kept: num(value.kept),
      added: num(value.added),
      updated: num(value.updated),
      note: str(value.note),
    },
  ];
}

function str(value: JsonValue | undefined): string {
  return typeof value === "string" ? value : "";
}

function num(value: JsonValue | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

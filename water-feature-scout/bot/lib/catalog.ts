import type { ParsedAddress } from "./match.js";

export type ListingStatus = "active" | "sold";

export type Listing = ParsedAddress & {
  keywords: string[];
  status: ListingStatus;
  source: string;
  url: string;
  firstSeen: string;
  lastSeen: string;
};

export type RunRecord = {
  at: string;
  status: ListingStatus;
  queriesRun: number;
  kept: number;
  added: number;
  updated: number;
  note: string;
};

export type Catalog = {
  listings: Listing[];
  runs: RunRecord[];
};

const SUFFIX_WORDS: Record<string, string> = {
  street: "st",
  avenue: "ave",
  road: "rd",
  drive: "dr",
  lane: "ln",
  court: "ct",
  circle: "cir",
  boulevard: "blvd",
  place: "pl",
  terrace: "ter",
  trail: "trl",
  parkway: "pkwy",
  highway: "hwy",
};

export function listingKey(row: Pick<Listing, "address" | "zip" | "state">): string {
  const street = row.address
    .toLowerCase()
    .replace(/[.,#]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => SUFFIX_WORDS[word] ?? word)
    .join(" ");
  return `${street}|${row.zip}|${row.state.toUpperCase()}`;
}

export function emptyCatalog(): Catalog {
  return { listings: [], runs: [] };
}

export function mergeListings(
  existing: Listing[],
  incoming: Listing[],
): { listings: Listing[]; added: number; updated: number } {
  const byKey = new Map<string, Listing>();
  for (const row of existing) byKey.set(listingKey(row), { ...row, keywords: [...row.keywords] });
  let added = 0;
  let updated = 0;
  for (const row of incoming) {
    const key = listingKey(row);
    const prior = byKey.get(key);
    if (!prior) {
      byKey.set(key, { ...row, keywords: uniqueKeywords(row.keywords) });
      added += 1;
      continue;
    }
    const keywords = uniqueKeywords([...prior.keywords, ...row.keywords]);
    const changed =
      keywords.join("|") !== prior.keywords.join("|") ||
      prior.status !== row.status ||
      prior.url !== row.url;
    byKey.set(key, {
      ...prior,
      keywords,
      status: row.lastSeen >= prior.lastSeen ? row.status : prior.status,
      source: joinUnique(prior.source, row.source),
      url: prior.url || row.url,
      firstSeen: prior.firstSeen <= row.firstSeen ? prior.firstSeen : row.firstSeen,
      lastSeen: prior.lastSeen >= row.lastSeen ? prior.lastSeen : row.lastSeen,
    });
    if (changed) updated += 1;
  }
  const listings = [...byKey.values()].sort((a, b) =>
    `${a.state}${a.city}${a.address}`.localeCompare(`${b.state}${b.city}${b.address}`),
  );
  return { listings, added, updated };
}

function uniqueKeywords(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out.sort((a, b) => b.length - a.length || a.localeCompare(b));
}

function joinUnique(left: string, right: string): string {
  const parts = new Set(
    `${left}; ${right}`
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean),
  );
  return [...parts].sort().join("; ");
}

export function formatEastern(iso: string): string {
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return `${day} ${time} ET`;
}

const LISTING_HEADERS = [
  "Address",
  "City",
  "State",
  "Zip Code",
  "Keyword Matched",
  "Status",
  "Source",
  "Listing URL",
  "First Seen",
  "Last Seen",
];

export function buildWorkbook(listings: Listing[], runs: RunRecord[]): Uint8Array {
  const listingRows = [
    LISTING_HEADERS,
    ...listings.map((row) => [
      row.address,
      row.city,
      row.state,
      row.zip,
      row.keywords.join("; "),
      row.status,
      row.source,
      row.url,
      formatEastern(row.firstSeen),
      formatEastern(row.lastSeen),
    ]),
  ];
  const runRows = [
    ["When", "Search", "Queries", "Kept", "Added", "Updated", "Note"],
    ...runs.map((run) => [
      formatEastern(run.at),
      run.status,
      String(run.queriesRun),
      String(run.kept),
      String(run.added),
      String(run.updated),
      run.note,
    ]),
  ];
  return zipStore([
    { name: "[Content_Types].xml", data: contentTypes() },
    { name: "_rels/.rels", data: packageRels() },
    { name: "xl/workbook.xml", data: workbookXml() },
    { name: "xl/_rels/workbook.xml.rels", data: workbookRels() },
    { name: "xl/worksheets/sheet1.xml", data: sheetXml(listingRows) },
    { name: "xl/worksheets/sheet2.xml", data: sheetXml(runRows) },
  ]);
}

function sheetXml(rows: string[][]): Uint8Array {
  const body = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, column) => {
          const ref = `${columnName(column)}${rowIndex + 1}`;
          return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");
  const xml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetData>${body}</sheetData></worksheet>`;
  return Buffer.from(xml);
}

function columnName(index: number): string {
  let n = index + 1;
  let name = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function contentTypes(): Uint8Array {
  return Buffer.from(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
      `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
      `<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
      `</Types>`,
  );
}

function packageRels(): Uint8Array {
  return Buffer.from(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
      `</Relationships>`,
  );
}

function workbookXml(): Uint8Array {
  return Buffer.from(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
      `<sheets>` +
      `<sheet name="Listings" sheetId="1" r:id="rId1"/>` +
      `<sheet name="Run Log" sheetId="2" r:id="rId2"/>` +
      `</sheets></workbook>`,
  );
}

function workbookRels(): Uint8Array {
  return Buffer.from(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
      `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>` +
      `</Relationships>`,
  );
}

function zipStore(files: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name);
    const data = Buffer.from(file.data);
    const crc = crc32(data);
    const local = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
      data,
    ]);
    locals.push(local);
    centrals.push(
      Buffer.concat([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(data.length),
        u32(data.length),
        u16(name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        name,
      ]),
    );
    offset += local.length;
  }
  const central = Buffer.concat(centrals);
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(central.length),
    u32(offset),
    u16(0),
  ]);
  return Buffer.concat([...locals, central, end]);
}

const CRC_TABLE = makeCrcTable();

function makeCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u16(value: number): Buffer {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(value);
  return buf;
}

function u32(value: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(value >>> 0);
  return buf;
}

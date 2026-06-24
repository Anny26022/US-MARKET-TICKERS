import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const BASE_URL = "https://finviz.com";
const SCREENER_URL = `${BASE_URL}/screener`;
const QUOTE_URL = `${BASE_URL}/quote.ashx`;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const generatedDir = path.join(repoRoot, "docs/integrations/generated");
const cacheDir = path.join(generatedDir, ".finviz-enrichment-cache");
const inputJson = path.join(generatedDir, "finviz-us-listed-equities-and-etfs.json");
const outputCsv = path.join(generatedDir, "finviz-us-listed-equities-and-etfs.csv");
const outputJson = path.join(generatedDir, "finviz-us-listed-equities-and-etfs.json");
const outputMeta = path.join(generatedDir, "finviz-us-listed-equities-and-etfs.meta.json");

const requestedColumns = [
  { key: "ticker", header: "ticker" },
  { key: "company", header: "company" },
  { key: "securityType", header: "securityType" },
  { key: "sector", header: "sector" },
  { key: "industry", header: "industry" },
  { key: "theme", header: "theme" },
  { key: "subtheme", header: "subtheme" },
  { key: "exchange", header: "exchange" },
  { key: "index", header: "index" },
  { key: "country", header: "country" },
  { key: "ipoDate", header: "ipoDate" },
  { key: "description", header: "description" },
  { key: "website", header: "website" },
  { key: "ceo", header: "ceo" },
  { key: "marketCap", header: "marketCap" },
  { key: "changePercent", header: "changePercent" },
  { key: "volume", header: "volume" },
  { key: "averageVolume", header: "averageVolume" },
  { key: "relativeVolume", header: "relativeVolume" },
  { key: "performanceWeek", header: "performanceWeek" },
  { key: "performanceMonth", header: "performanceMonth" },
  { key: "performanceQuarter", header: "performanceQuarter" },
  { key: "performanceHalfYear", header: "performanceHalfYear" },
  { key: "performanceYear", header: "performanceYear" },
  { key: "employees", header: "employees" },
  { key: "sharesOutstanding", header: "sharesOutstanding" },
  { key: "sharesFloat", header: "sharesFloat" },
  { key: "insiderOwnership", header: "insiderOwnership" },
  { key: "institutionalOwnership", header: "institutionalOwnership" },
  { key: "etfCategory", header: "etfCategory" },
  { key: "etfAssetType", header: "etfAssetType" },
  { key: "etfTags", header: "etfTags" },
];

const args = parseArgs(process.argv.slice(2));
const force = Boolean(args.force);
const skipProfiles = Boolean(args["skip-profiles"]);
const profilesCacheOnly = Boolean(args["profiles-cache-only"]);
const profileDelayMs = Number(args["profile-delay-ms"] ?? 150);
const screenerDelayMs = Number(args["screener-delay-ms"] ?? 250);
const profileConcurrency = Number(args["profile-concurrency"] ?? 6);
const profileLimit = args["profile-limit"] ? Number(args["profile-limit"]) : Infinity;

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, rawValue] = arg.slice(2).split("=", 2);
    out[key] = rawValue ?? true;
  }
  return out;
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeEmpty(value) {
  const cleaned = cleanText(value);
  return cleaned === "-" ? "" : cleaned;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cachePathFor(kind, url) {
  const hash = crypto.createHash("sha256").update(url).digest("hex");
  return path.join(cacheDir, kind, `${hash}.html`);
}

async function fetchText(url, kind, label, delayMs) {
  const cachePath = cachePathFor(kind, url);
  await fs.mkdir(path.dirname(cachePath), { recursive: true });

  if (!force) {
    try {
      return await fs.readFile(cachePath, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: SCREENER_URL,
      },
    });

    if (response.status === 429 && attempt < 5) {
      const backoffMs = delayMs * attempt * 10;
      console.warn(`Rate limited: ${label}; backing off ${backoffMs}ms`);
      await sleep(backoffMs);
      continue;
    }

    if (!response.ok) {
      throw new Error(`${label} failed: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    await fs.writeFile(cachePath, text);
    await sleep(delayMs);
    return text;
  }

  throw new Error(`${label} exceeded retry budget`);
}

async function readCachedText(url, kind) {
  try {
    return await fs.readFile(cachePathFor(kind, url), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function buildBulkUrl(rowOffset = 1) {
  const url = new URL(SCREENER_URL);
  url.searchParams.set("v", "152");
  url.searchParams.set("ft", "4");
  url.searchParams.set("o", "ticker");
  url.searchParams.set("c", "1,24,25,26,28,76");
  if (rowOffset > 1) url.searchParams.set("r", String(rowOffset));
  return url.toString();
}

function buildQuoteUrl(ticker) {
  const url = new URL(QUOTE_URL);
  url.searchParams.set("t", ticker);
  url.searchParams.set("p", "d");
  return url.toString();
}

function parseBulkPage(html) {
  const document = new JSDOM(html).window.document;
  const totalText = cleanText(document.querySelector("#screener-total")?.textContent ?? "");
  const totalMatch = totalText.match(/\/\s*([\d,]+)\s+Total/i);
  const total = totalMatch ? Number(totalMatch[1].replace(/,/g, "")) : null;
  const offsets = Array.from(document.querySelectorAll("#screener-page-select option"))
    .map((option) => Number(option.getAttribute("value")))
    .filter(Number.isFinite);

  const rows = Array.from(document.querySelectorAll("tr.styled-row")).map((tr) => {
    const cells = Array.from(tr.querySelectorAll("td")).map((td) => normalizeEmpty(td.textContent));
    return {
      ticker: cells[0] ?? "",
      sharesOutstanding: cells[1] ?? "",
      sharesFloat: cells[2] ?? "",
      insiderOwnership: cells[3] ?? "",
      institutionalOwnership: cells[4] ?? "",
      employees: cells[5] ?? "",
    };
  }).filter((row) => row.ticker);

  return { total, offsets, rows };
}

async function fetchBulkFields() {
  const firstHtml = await fetchText(buildBulkUrl(1), "screener", "bulk fields page 1", screenerDelayMs);
  const firstPage = parseBulkPage(firstHtml);
  const offsets = firstPage.offsets.length ? firstPage.offsets : [1];
  const rows = [...firstPage.rows];

  for (const offset of offsets.slice(1)) {
    const html = await fetchText(buildBulkUrl(offset), "screener", `bulk fields r=${offset}`, screenerDelayMs);
    rows.push(...parseBulkPage(html).rows);
    if (rows.length % 1000 === 0 || offset === offsets.at(-1)) {
      console.log(`Fetched ${rows.length}/${firstPage.total ?? "?"} bulk rows`);
    }
  }

  return new Map(rows.map((row) => [row.ticker, row]));
}

function parseQuoteProfile(html) {
  const document = new JSDOM(html).window.document;
  const companyLink = document.querySelector(".quote-header_ticker-wrapper_company a[href]");
  const description = cleanText(document.querySelector(".quote_profile-bio")?.textContent ?? "");
  const officers = Array.from(document.querySelectorAll(".quote_profile-officers .flex.flex-col"));
  const ceoNode = officers.find((node) => /(^|\b)CEO(\b|&|,)/i.test(cleanText(node.querySelector(".text-3xs")?.textContent ?? "")));

  return {
    website: companyLink ? companyLink.href : "",
    description,
    ceo: ceoNode ? cleanText(ceoNode.querySelector(".font-medium")?.textContent ?? "") : "",
  };
}

async function fetchProfile(ticker) {
  const url = buildQuoteUrl(ticker);
  const html = profilesCacheOnly
    ? await readCachedText(url, "quote")
    : await fetchText(url, "quote", `quote ${ticker}`, profileDelayMs);
  if (!html) return null;
  return parseQuoteProfile(html);
}

async function enrichProfiles(rows) {
  const rowsForProfiles = rows.slice(0, profileLimit);
  let nextIndex = 0;
  let completed = 0;
  let fetched = 0;
  let errors = 0;

  async function worker() {
    while (nextIndex < rowsForProfiles.length) {
      const row = rowsForProfiles[nextIndex];
      nextIndex += 1;

      try {
        const profile = await fetchProfile(row.ticker);
        if (profile) {
          Object.assign(row, profile);
          fetched += 1;
        }
      } catch (error) {
        errors += 1;
        console.warn(`Profile failed for ${row.ticker}: ${error.message}`);
      }

      completed += 1;
      if (completed % 100 === 0 || completed === rowsForProfiles.length) {
        console.log(`Processed ${completed}/${rowsForProfiles.length} quote profiles`);
      }
    }
  }

  const workers = Array.from(
    { length: Math.max(1, Math.min(profileConcurrency, rowsForProfiles.length)) },
    () => worker(),
  );
  await Promise.all(workers);

  return { fetched, errors };
}

function toCsv(rows) {
  const escapeCell = (value) => {
    const text = String(value ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
  };

  return [
    requestedColumns.map((column) => column.header).join(","),
    ...rows.map((row) => requestedColumns.map((column) => escapeCell(row[column.key])).join(",")),
  ].join("\n") + "\n";
}

async function main() {
  const rows = JSON.parse(await fs.readFile(inputJson, "utf8"));

  console.log("Fetching bulk ownership/share/employee fields");
  const bulkByTicker = await fetchBulkFields();

  for (const row of rows) {
    const bulk = bulkByTicker.get(row.ticker);
    if (bulk) Object.assign(row, bulk);
  }

  let profileCount = 0;
  let profileErrorCount = 0;
  if (!skipProfiles) {
    const profileResult = await enrichProfiles(rows);
    profileCount = profileResult.fetched;
    profileErrorCount = profileResult.errors;
  }

  await fs.writeFile(outputCsv, toCsv(rows));
  await fs.writeFile(outputJson, JSON.stringify(rows, null, 2) + "\n");

  const meta = JSON.parse(await fs.readFile(outputMeta, "utf8"));
  meta.enrichment = {
    generatedAt: new Date().toISOString(),
    requestedColumnsAdded: [
      "description",
      "website",
      "ceo",
      "employees",
      "sharesOutstanding",
      "sharesFloat",
      "insiderOwnership",
      "institutionalOwnership",
    ],
    bulkFieldsMatched: rows.filter((row) => bulkByTicker.has(row.ticker)).length,
    quoteProfilesFetched: profileCount,
      quoteProfileErrors: profileErrorCount,
      quoteProfilesSkipped: skipProfiles,
      quoteProfilesCacheOnly: profilesCacheOnly,
  };
  await fs.writeFile(outputMeta, JSON.stringify(meta, null, 2) + "\n");

  console.log(JSON.stringify({
    rows: rows.length,
    bulkFieldsMatched: meta.enrichment.bulkFieldsMatched,
    quoteProfilesFetched: profileCount,
    quoteProfileErrors: profileErrorCount,
    outputCsv,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

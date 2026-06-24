import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const BASE_URL = "https://finviz.com";
const SCREENER_URL = `${BASE_URL}/screener`;
const THEMES_MAP_URL = `${BASE_URL}/map.ashx?t=themes`;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const generatedDir = path.join(repoRoot, "docs/integrations/generated");
const cacheDir = path.join(generatedDir, ".finviz-export-cache");

const columns = [
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
  { key: "etfCategory", header: "etfCategory" },
  { key: "etfAssetType", header: "etfAssetType" },
  { key: "etfTags", header: "etfTags" },
];

const customColumnIds = [
  1, // ticker
  2, // company
  3, // sector
  4, // industry
  5, // country
  79, // index
  129, // exchange
  70, // ipo date
  103, // ETF single category
  100, // ETF asset type
  105, // ETF tags
].join(",");

const args = parseArgs(process.argv.slice(2));
const requestDelayMs = Number(args["delay-ms"] ?? 350);
const force = Boolean(args.force);
const countryUsaOnly = Boolean(args["country-usa-only"]);
const screenerFilter = countryUsaOnly ? "geo_usa" : "";
const outputBaseName = countryUsaOnly
  ? "finviz-country-usa-equities-and-etfs"
  : "finviz-us-listed-equities-and-etfs";
const outputCsv = path.join(generatedDir, `${outputBaseName}.csv`);
const outputJson = path.join(generatedDir, `${outputBaseName}.json`);
const outputMeta = path.join(generatedDir, `${outputBaseName}.meta.json`);

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, rawValue] = arg.slice(2).split("=", 2);
    out[key] = rawValue ?? true;
  }
  return out;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeEmpty(value) {
  const cleaned = cleanText(value);
  return cleaned === "-" ? "" : cleaned;
}

function cachePathFor(url) {
  const hash = crypto.createHash("sha256").update(url).digest("hex");
  return path.join(cacheDir, `${hash}.html`);
}

async function fetchText(url, label = url) {
  await fs.mkdir(cacheDir, { recursive: true });
  const cachePath = cachePathFor(url);

  if (!force) {
    try {
      return await fs.readFile(cachePath, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: SCREENER_URL,
      },
    });

    if (response.status === 429 && attempt < maxAttempts) {
      const backoffMs = requestDelayMs * attempt * 6;
      console.warn(`Rate limited while fetching ${label}; backing off ${backoffMs}ms`);
      await sleep(backoffMs);
      continue;
    }

    if (!response.ok) {
      throw new Error(`${label} failed: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    await fs.writeFile(cachePath, text);
    await sleep(requestDelayMs);
    return text;
  }

  throw new Error(`${label} exceeded retry budget`);
}

function buildScreenerUrl(rowOffset = 1) {
  const url = new URL(SCREENER_URL);
  url.searchParams.set("v", "152");
  url.searchParams.set("ft", "4");
  url.searchParams.set("o", "ticker");
  url.searchParams.set("c", customColumnIds);
  if (screenerFilter) url.searchParams.set("f", screenerFilter);
  if (rowOffset > 1) url.searchParams.set("r", String(rowOffset));
  return url.toString();
}

function parseScreenerPage(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
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
      company: cells[1] ?? "",
      sector: cells[2] ?? "",
      industry: cells[3] ?? "",
      country: cells[4] ?? "",
      index: cells[5] ?? "",
      exchange: cells[6] ?? "",
      ipoDate: cells[7] ?? "",
      etfCategory: cells[8] ?? "",
      etfAssetType: cells[9] ?? "",
      etfTags: cells[10] ?? "",
    };
  }).filter((row) => row.ticker);

  return { total, offsets, rows };
}

async function fetchScreenerRows() {
  const firstHtml = await fetchText(buildScreenerUrl(1), "screener page 1");
  const firstPage = parseScreenerPage(firstHtml);
  const offsets = firstPage.offsets.length ? firstPage.offsets : [1];
  const rows = [...firstPage.rows];

  for (const offset of offsets.slice(1)) {
    const html = await fetchText(buildScreenerUrl(offset), `screener page r=${offset}`);
    const page = parseScreenerPage(html);
    rows.push(...page.rows);
    if (rows.length % 500 === 0 || offset === offsets.at(-1)) {
      console.log(`Fetched ${rows.length}/${firstPage.total ?? "?"} screener rows`);
    }
  }

  return { total: firstPage.total, rows };
}

function extractScriptUrls(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const urls = [
    ...Array.from(document.querySelectorAll("script[src]")).map((script) => script.getAttribute("src")),
    ...Array.from(document.querySelectorAll("link[as='script'][href]")).map((link) => link.getAttribute("href")),
  ];

  return Array.from(new Set(urls.map((url) => new URL(url, BASE_URL).toString())));
}

function extractBalancedObjectAfter(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) return null;

  const start = source.indexOf("{", markerIndex + marker.length);
  if (start === -1) return null;

  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let i = start; i < source.length; i += 1) {
    const char = source[i];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }

  return null;
}

function parseThemeTreeFromBundle(source) {
  const objectLiteral = extractBalancedObjectAfter(source, "e.exports=");
  if (!objectLiteral?.includes("Artificial Intelligence")) return null;

  return vm.runInNewContext(`(${objectLiteral})`, Object.create(null), {
    timeout: 1_000,
  });
}

async function fetchThemeTree() {
  const html = await fetchText(THEMES_MAP_URL, "themes map");
  const scriptUrls = extractScriptUrls(html);

  for (const url of scriptUrls) {
    const source = await fetchText(url, path.basename(new URL(url).pathname));
    const tree = parseThemeTreeFromBundle(source);
    if (tree) return { tree, bundleUrl: url };
  }

  throw new Error("Could not find Finviz theme hierarchy bundle");
}

function buildThemeLookup(tree) {
  const lookup = new Map();
  let subthemeCount = 0;
  let assignmentCount = 0;

  for (const bucket of tree.children ?? []) {
    for (const themeNode of bucket.children ?? []) {
      const theme = themeNode.name;
      for (const subthemeNode of themeNode.children ?? []) {
        subthemeCount += 1;
        const subtheme = subthemeNode.description || subthemeNode.displayName || subthemeNode.name;
        const tickers = String(subthemeNode.extra ?? "")
          .split(",")
          .map((ticker) => ticker.trim().toUpperCase())
          .filter(Boolean);

        for (const ticker of tickers) {
          const current = lookup.get(ticker) ?? { themes: new Set(), subthemes: new Set() };
          current.themes.add(theme);
          current.subthemes.add(subtheme);
          lookup.set(ticker, current);
          assignmentCount += 1;
        }
      }
    }
  }

  return { lookup, subthemeCount, assignmentCount };
}

function classifySecurity(row) {
  if (row.industry === "Exchange Traded Fund") return "ETF";
  if (row.industry.startsWith("Closed-End Fund")) return "Closed-End Fund";
  if (row.industry === "Shell Companies") return "Shell Company";
  return "Stock";
}

function mergeThemeData(rows, themeLookup) {
  return rows.map((row) => {
    const themeData = themeLookup.get(row.ticker.toUpperCase());
    return {
      ...row,
      securityType: classifySecurity(row),
      theme: themeData ? Array.from(themeData.themes).sort().join("; ") : "",
      subtheme: themeData ? Array.from(themeData.subthemes).sort().join("; ") : "",
    };
  });
}

function toCsv(rows) {
  const escapeCell = (value) => {
    const text = String(value ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
  };

  return [
    columns.map((column) => column.header).join(","),
    ...rows.map((row) => columns.map((column) => escapeCell(row[column.key])).join(",")),
  ].join("\n") + "\n";
}

async function main() {
  await fs.mkdir(generatedDir, { recursive: true });

  console.log(`Fetching Finviz screener rows (${countryUsaOnly ? "country USA only" : "all US-listed Finviz universe"})`);
  const screener = await fetchScreenerRows();

  console.log("Fetching Finviz themes map hierarchy");
  const themes = await fetchThemeTree();
  const themeIndex = buildThemeLookup(themes.tree);
  const rows = mergeThemeData(screener.rows, themeIndex.lookup);

  rows.sort((a, b) => a.ticker.localeCompare(b.ticker));

  const meta = {
    generatedAt: new Date().toISOString(),
    universe: countryUsaOnly
      ? "Finviz public screener, custom view, filtered with f=geo_usa."
      : "Finviz public screener default US-listed universe, custom view.",
    rowCount: rows.length,
    screenerReportedTotal: screener.total,
    sourceUrls: {
      screener: buildScreenerUrl(1),
      themesMap: THEMES_MAP_URL,
      themesBundle: themes.bundleUrl,
    },
    columns: columns.map((column) => column.header),
    themeMapping: {
      method: "Mapped from the public Themes Map hierarchy bundle. Finviz exposes theme/subtheme as filters, not direct screener output columns.",
      tickersWithTheme: rows.filter((row) => row.theme).length,
      themeTickerAssignments: themeIndex.assignmentCount,
      subthemeCount: themeIndex.subthemeCount,
    },
    notes: [
      "ETF category, asset type, and tags are included because Finviz has separate ETF descriptors and most ETF rows do not appear in the themes map hierarchy.",
      "Index and IPO Date are Finviz custom view columns. Blank values represent '-' on the source page.",
      "Quotes and screener rows are delayed/subject to Finviz public-page availability.",
    ],
  };

  await fs.writeFile(outputCsv, toCsv(rows));
  await fs.writeFile(outputJson, JSON.stringify(rows, null, 2) + "\n");
  await fs.writeFile(outputMeta, JSON.stringify(meta, null, 2) + "\n");

  console.log(JSON.stringify({
    rowCount: rows.length,
    screenerReportedTotal: screener.total,
    tickersWithTheme: meta.themeMapping.tickersWithTheme,
    outputCsv,
    outputJson,
    outputMeta,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

# US Market Tickers

Daily refreshed Finviz-derived dataset for US-listed equities, ETFs, closed-end funds, shell companies, and related listings.

## Dataset

Primary files:

- `docs/integrations/generated/finviz-us-listed-equities-and-etfs.csv`
- `docs/integrations/generated/finviz-us-listed-equities-and-etfs.json`
- `docs/integrations/generated/finviz-us-listed-equities-and-etfs.meta.json`

The scheduled workflow refreshes the dataset after US market hours using Finviz public screener/custom-column pages. Quote/profile pages are intentionally skipped.

## Refresh

Run locally:

```bash
npm ci
node scripts/probes/finviz/export-finviz-us-listed-equities.mjs --force --delay-ms=500
node scripts/probes/finviz/enrich-finviz-us-listed-equities.mjs --force --skip-profiles --screener-delay-ms=500
```

GitHub Actions workflow:

- `.github/workflows/refresh-finviz-us-listed.yml`


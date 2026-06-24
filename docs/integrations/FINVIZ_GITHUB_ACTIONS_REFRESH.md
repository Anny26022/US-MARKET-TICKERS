# Finviz GitHub Actions Refresh

This repo can refresh the public Finviz US-listed equities and ETFs dataset automatically after US market hours.

## What Runs

The workflow is `.github/workflows/refresh-finviz-us-listed.yml`.

It runs:

```bash
node scripts/probes/finviz/export-finviz-us-listed-equities.mjs --force --delay-ms=500
node scripts/probes/finviz/enrich-finviz-us-listed-equities.mjs --force --skip-profiles --screener-delay-ms=500
```

This intentionally skips Finviz quote/profile pages. It only uses the faster screener/custom-column pages, including:

- ticker
- company
- security type
- sector
- industry
- theme
- subtheme
- exchange
- index
- country
- IPO date
- market cap
- change %
- current volume
- average volume, Finviz 3-month average
- relative volume, current volume divided by average volume
- performance 1 week
- performance 1 month
- performance 3 month
- performance 6 month
- performance 12 month
- employees
- shares outstanding
- shares float
- insider ownership
- institutional ownership
- ETF category
- ETF asset type
- ETF tags

Profile fields such as description, website, and CEO are not fetched by the scheduled job because Finviz quote pages rate-limit more aggressively.

## Schedule

The workflow uses:

```yaml
cron: "30 0 * * 2-6"
```

That runs Tuesday through Saturday at 00:30 UTC, which is after the prior Monday-Friday US market session.

## Files Updated

The workflow commits these generated files:

- `docs/integrations/generated/finviz-us-listed-equities-and-etfs.csv`
- `docs/integrations/generated/finviz-us-listed-equities-and-etfs.json`
- `docs/integrations/generated/finviz-us-listed-equities-and-etfs.meta.json`
- `docs/integrations/generated/finviz-us-listed-equities-and-etfs.README.md`

The local HTML caches are ignored:

- `docs/integrations/generated/.finviz-export-cache/`
- `docs/integrations/generated/.finviz-enrichment-cache/`

## New Repo Setup

Create a new GitHub repo, then push this code:

```bash
git init
git add package.json package-lock.json .gitignore .github/workflows/refresh-finviz-us-listed.yml
git add scripts/probes/finviz/export-finviz-us-listed-equities.mjs
git add scripts/probes/finviz/enrich-finviz-us-listed-equities.mjs
git add docs/integrations
git commit -m "Add Finviz dataset refresh"
git branch -M main
git remote add origin git@github.com:YOUR_USER/YOUR_REPO.git
git push -u origin main
```

After the repo exists, open the Actions tab and enable workflows if GitHub asks. You can test immediately with **Run workflow**.

## Notes

- No API key is required.
- The workflow needs `contents: write` permission so `GITHUB_TOKEN` can commit refreshed data.
- If the workflow fails with Finviz rate limiting, increase `--delay-ms` and `--screener-delay-ms` to `1000` or `1500`.
- This is a public-page integration, so availability can change if Finviz changes markup or blocks GitHub runner IPs.

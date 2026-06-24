# Finviz Screener Protocol Deep Dive

Generated from the live Finviz screener on **2026-06-23T22:01:19.006Z** using the extractor at `scripts/probes/finviz/extract-finviz-screener-spec.mjs`.

## Scope

This document reverse-engineers the current **Finviz stock screener transport and state model**. It focuses on the live surface exposed by:

- [Screener](https://finviz.com/screener?v=111&ft=4)
- [Helper script](https://finviz.com/assets/dist-legacy/script/screener.v1.56fe28c8.js)
- [App bundle](https://finviz.com/assets/dist-legacy/screener.v1.f65590f1.js)

It is intentionally protocol-oriented:

- endpoint and request model
- query-string grammar
- view, sort, signal, and filter enumerations
- response anatomy used during refresh
- combination math for the public dropdown state space

It does **not** attempt to list the literal Cartesian product of every valid URL because that count is astronomically large. Instead, it enumerates every primitive dimension and the exact serialization rules needed to synthesize any supported combination.

## Transport Model

- The screener transport is HTML-first. The main UI mutates the query string and reloads `/screener` rather than posting JSON payloads to a hidden API.
- Background refresh re-fetches the current screener URL with `&rev=<timestamp>` and swaps DOM fragments instead of requesting structured JSON.
- Custom multi-select filter editing exists behind Elite-only UI for many filters. The public dropdown catalog remains single-select and is fully enumerable from the HTML.

### Primary endpoint

- `GET /screener`
- The page normalizes legacy `.ashx` screener paths back to `/screener`.

### Side endpoints observed in current scripts

- `/api/set_cookie`
- `/api/settings_submit`
- `/api/v1/screener-export-csv`
- `/screener`
- `/screener_compare_open`
- `/screener_portfolio_add`
- `/screener_presets`

## Query Parameter Schema

| Param | Role | Description |
| --- | --- | --- |
| `v` | view | Three-digit screener view code, such as 111 for Overview. |
| `f` | filters | Filter state blob encoded as comma-separated filterId_value groups. |
| `o` | sort | Sort field. Descending is encoded by prefixing the field with '-'. |
| `s` | signal | Signal preset slug from the Signal dropdown. |
| `t` | tickers | Ticker input payload. The page sanitizes comma-separated ticker strings client-side. |
| `ft` | filter-tab | Filter tab code: 1 Descriptive, 2 Fundamental, 3 Technical, 4 All, 5 ETF, 6 News. |
| `r` | pagination | Row offset used for pagination. Default first page is r=1 or omitted. |
| `ar` | auto-refresh | Auto-refresh interval in seconds. |
| `c` | columns | Custom column payload for views that support column overrides. |
| `st` | map-subtype | Map subtype for map-oriented screener views. |
| `show_etf` | ui-carry-over | Display preference preserved across navigations. |
| `show_industry` | ui-carry-over | Display preference preserved across navigations. |
| `preset_order` | ui-carry-over | Preset ordering preference preserved across navigations. |
| `rev` | refresh-buster | Timestamp cache-buster appended by the client during background refresh. |

### Carry-over params

The current bundle explicitly preserves these params across some navigations:

- `show_etf`
- `show_industry`
- `preset_order`

## Filter Encoding

- `f=` is serialized as `filterId_value[,filterId_value2...]`.
- Each filter entry is parsed by splitting at the last underscore, so filter ids may themselves contain underscores.
- When a filter supports multiple values, the value segment uses pipes: `filterId_value1|value2|value3`.

Examples:

```text
f=cap_large,exch_nasd
f=sec_technology|financial,geo_usa
f=ta_perf_weekup,sh_price_o50
```

## View Codes

| Code | Label | Sample href |
| --- | --- | --- |
| 111 | Overview | `screener?v=111&ft=4` |
| 121 | Valuation | `screener?v=121&ft=4` |
| 161 | Financial | `screener?v=161&ft=4` |
| 131 | Ownership | `screener?v=131&ft=4` |
| 141 | Performance | `screener?v=141&ft=4` |
| 171 | Technical | `screener?v=171&ft=4` |
| 181 | ETF | `screener?v=181&ft=4` |
| 191 | ETF Perf | `screener?v=191&ft=4` |
| 151 | Custom | `screener?v=151&ft=4` |
| 211 | Charts | `screener?v=211&ft=4` |
| 411 | Tickers | `screener?v=411&ft=4` |
| 311 | Basic | `screener?v=311&ft=4` |
| 351 | TA | `screener?v=351&ft=4` |
| 321 | News | `screener?v=321&ft=4` |
| 341 | Snapshot | `screener?v=341&ft=4` |
| 711 | Maps | `screener?v=711&ft=4` |

## Filter Tabs

| Code | Label | Selected in snapshot |
| --- | --- | --- |
| 1 | Descriptive | No |
| 2 | Fundamental | No |
| 3 | Technical | No |
| 6 | News | No |
| 5 | ETF | No |
| 4 | All | Yes |

## Sort Surface

Observed sort field count: **131**

Descending order is encoded by prefixing the sort field with `-`.

| Sort key | Label | Direction in option URL |
| --- | --- | --- |
| `ticker` | Ticker | asc |
| `tickersfilter` | Tickers Input Filter | asc |
| `company` | Company | asc |
| `sector` | Sector | asc |
| `industry` | Industry | asc |
| `country` | Country | asc |
| `index` | Index | asc |
| `exchange` | Exchange | asc |
| `marketcap` | Market Cap. | asc |
| `pe` | Price/Earnings | asc |
| `forwardpe` | Forward Price/Earnings | asc |
| `peg` | PEG (Price/Earnings/Growth) | asc |
| `ps` | Price/Sales | asc |
| `pb` | Price/Book | asc |
| `pc` | Price/Cash | asc |
| `pfcf` | Price/Free Cash Flow | asc |
| `dividendyield` | Dividend Yield | asc |
| `payoutratio` | Payout Ratio | asc |
| `eps` | EPS (TTM) | asc |
| `estq1` | EPS Estimate Next Quarter | asc |
| `epsyoy` | EPS Growth This Year | asc |
| `epsyoy1` | EPS Growth Next Year | asc |
| `eps3years` | EPS Growth Past 3 Years | asc |
| `eps5years` | EPS Growth Past 5 Years | asc |
| `estltgrowth` | EPS Growth Next 5 Years | asc |
| `epsqoq` | EPS Growth Qtr Over Qtr | asc |
| `epsyoyttm` | EPS Year Over Year TTM | asc |
| `sales3years` | Sales Growth Past 3 Years | asc |
| `sales5years` | Sales Growth Past 5 Years | asc |
| `salesqoq` | Sales Growth Qtr Over Qtr | asc |
| `salesyoyttm` | Sales Year Over Year TTM | asc |
| `epssurprise` | EPS Surprise | asc |
| `revenuesurprise` | Revenue Surprise | asc |
| `sharesoutstanding2` | Shares Outstanding | asc |
| `sharesfloat` | Shares Float | asc |
| `floatoutstandingpct` | Float/Outstanding | asc |
| `insiderown` | Insider Ownership | asc |
| `insidertrans` | Insider Transactions | asc |
| `instown` | Institutional Ownership | asc |
| `insttrans` | Institutional Transactions | asc |
| `shortinterestshare` | Short Interest Share | asc |
| `shortinterestratio` | Short Interest Ratio | asc |
| `shortinterest` | Short Interest | asc |
| `earningsdate` | Earnings Date | asc |
| `news_date` | Latest News | asc |
| `roa` | Return on Assets | asc |
| `roe` | Return on Equity | asc |
| `roi` | Return on Invested Capital | asc |
| `curratio` | Current Ratio | asc |
| `quickratio` | Quick Ratio | asc |
| `ltdebteq` | LT Debt/Equity | asc |
| `debteq` | Total Debt/Equity | asc |
| `grossmargin` | Gross Margin | asc |
| `opermargin` | Operating Margin | asc |
| `netmargin` | Net Profit Margin | asc |
| `recom` | Analyst Recommendation | asc |
| `perf1w` | Performance (Week) | asc |
| `perf4w` | Performance (Month) | asc |
| `perf13w` | Performance (Quarter) | asc |
| `perf26w` | Performance (Half Year) | asc |
| `perfytd` | Performance (Year To Date) | asc |
| `perf52w` | Performance (Year) | asc |
| `perf3y` | Performance (3 Years) | asc |
| `perf5y` | Performance (5 Years) | asc |
| `perf10y` | Performance (10 Years) | asc |
| `beta` | Beta | asc |
| `averagetruerange` | Average True Range | asc |
| `volatility1w` | Volatility (Week) | asc |
| `volatility4w` | Volatility (Month) | asc |
| `sma20` | 20-Day SMA (Relative) | asc |
| `sma50` | 50-Day SMA (Relative) | asc |
| `sma200` | 200-Day SMA (Relative) | asc |
| `high50d` | 50-Day High (Relative) | asc |
| `low50d` | 50-Day Low (Relative) | asc |
| `high52w` | 52-Week High (Relative) | asc |
| `low52w` | 52-Week Low (Relative) | asc |
| `52wrange` | 52-Week Range | asc |
| `highat` | All-Time High (Relative) | asc |
| `lowat` | All-Time Low (Relative) | asc |
| `rsi` | Relative Strength Index (14) | asc |
| `averagevolume` | Average Volume (3 Month) | asc |
| `relativevolume` | Relative Volume | asc |
| `change` | Change | asc |
| `changeopen` | Change from Open | asc |
| `gap` | Gap | asc |
| `volume` | Volume | asc |
| `open` | Open | asc |
| `high` | High | asc |
| `low` | Low | asc |
| `price` | Price | asc |
| `prevclose` | Previous Close | asc |
| `targetprice` | Target Price | asc |
| `ipodate` | IPO Date | asc |
| `book` | Book Value per Share | asc |
| `cashpershare` | Cash per Share | asc |
| `dividend` | Dividend | asc |
| `dividendexdate` | Dividend Ex-Date | asc |
| `dividendttm` | Dividend TTM | asc |
| `dividend1y` | Dividend Growth (1 Year) | asc |
| `dividend3y` | Dividend Growth (3 Year) | asc |
| `dividend5y` | Dividend Growth (5 Year) | asc |
| `employees` | Employees | asc |
| `income` | Income | asc |
| `sales` | Sales | asc |
| `enterpriseValue` | Enterprise Value | asc |
| `evebitda` | EV/EBITDA | asc |
| `evsales` | EV/Sales | asc |
| `optionable` | Optionable | asc |
| `shortable` | Shortable | asc |
| `newsurl` | News URL | asc |
| `newstitle` | News Title | asc |
| `newstime` | News Time | asc |
| `wiimdailydigest` | Daily Digest | asc |
| `e.category` | ETF - Single Category | asc |
| `e.tags` | ETF - Tags | asc |
| `e.totalholdings` | ETF - Total Holdings | asc |
| `e.assetsundermanagement` | ETF - Assets Under Management | asc |
| `e.netflows1month` | ETF - Net Fund Flows (1 Month) | asc |
| `e.netflows1monthpct` | ETF - Net Fund Flows% (1 Month) | asc |
| `e.netflows3month` | ETF - Net Fund Flows (3 Month) | asc |
| `e.netflows3monthpct` | ETF - Net Fund Flows% (3 Month) | asc |
| `e.netflowsytd` | ETF - Net Fund Flows (YTD) | asc |
| `e.netflowsytdpct` | ETF - Net Fund Flows% (YTD) | asc |
| `e.return1year` | ETF - Annualized Return (1 Year) | asc |
| `e.return3year` | ETF - Annualized Return (3 Year) | asc |
| `e.return5year` | ETF - Annualized Return (5 Year) | asc |
| `e.netexpenseratio` | ETF - Net Expense Ratio | asc |
| `e.activepassive` | ETF - Active Passive | asc |
| `e.assettype` | ETF - Asset Type | asc |
| `e.etftype` | ETF - Type | asc |
| `e.sectortheme` | ETF - Sector/Theme | asc |

## Signal Surface

Observed signal count including the “none” state: **33**

| Signal code | Label | Sample href |
| --- | --- | --- |
| (none) | None (all stocks) | `screener?v=111&ft=4` |
| `ta_topgainers` | Top Gainers | `screener?v=111&s=ta_topgainers&ft=4` |
| `ta_toplosers` | Top Losers | `screener?v=111&s=ta_toplosers&ft=4` |
| `ta_newhigh` | New High | `screener?v=111&s=ta_newhigh&ft=4` |
| `ta_newlow` | New Low | `screener?v=111&s=ta_newlow&ft=4` |
| `ta_mostvolatile` | Most Volatile | `screener?v=111&s=ta_mostvolatile&ft=4` |
| `ta_unusualvolume` | Unusual Volume | `screener?v=111&s=ta_unusualvolume&ft=4` |
| `ta_overbought` | Overbought | `screener?v=111&s=ta_overbought&ft=4` |
| `ta_oversold` | Oversold | `screener?v=111&s=ta_oversold&ft=4` |
| `n_downgrades` | Downgrades | `screener?v=111&s=n_downgrades&ft=4` |
| `n_upgrades` | Upgrades | `screener?v=111&s=n_upgrades&ft=4` |
| `n_earningsbefore` | Earnings Before | `screener?v=111&s=n_earningsbefore&ft=4` |
| `n_earningsafter` | Earnings After | `screener?v=111&s=n_earningsafter&ft=4` |
| `it_latestbuys` | Recent Insider Buying | `screener?v=111&s=it_latestbuys&ft=4` |
| `it_latestsales` | Recent Insider Selling | `screener?v=111&s=it_latestsales&ft=4` |
| `n_majornews` | Major News | `screener?v=111&s=n_majornews&ft=4` |
| `ta_p_horizontal` | Horizontal S/R | `screener?v=111&s=ta_p_horizontal&ft=4` |
| `ta_p_tlresistance` | TL Resistance | `screener?v=111&s=ta_p_tlresistance&ft=4` |
| `ta_p_tlsupport` | TL Support | `screener?v=111&s=ta_p_tlsupport&ft=4` |
| `ta_p_wedgeup` | Wedge Up | `screener?v=111&s=ta_p_wedgeup&ft=4` |
| `ta_p_wedgedown` | Wedge Down | `screener?v=111&s=ta_p_wedgedown&ft=4` |
| `ta_p_wedgeresistance` | Triangle Ascending | `screener?v=111&s=ta_p_wedgeresistance&ft=4` |
| `ta_p_wedgesupport` | Triangle Descending | `screener?v=111&s=ta_p_wedgesupport&ft=4` |
| `ta_p_wedge` | Wedge | `screener?v=111&s=ta_p_wedge&ft=4` |
| `ta_p_channelup` | Channel Up | `screener?v=111&s=ta_p_channelup&ft=4` |
| `ta_p_channeldown` | Channel Down | `screener?v=111&s=ta_p_channeldown&ft=4` |
| `ta_p_channel` | Channel | `screener?v=111&s=ta_p_channel&ft=4` |
| `ta_p_doubletop` | Double Top | `screener?v=111&s=ta_p_doubletop&ft=4` |
| `ta_p_doublebottom` | Double Bottom | `screener?v=111&s=ta_p_doublebottom&ft=4` |
| `ta_p_multipletop` | Multiple Top | `screener?v=111&s=ta_p_multipletop&ft=4` |
| `ta_p_multiplebottom` | Multiple Bottom | `screener?v=111&s=ta_p_multiplebottom&ft=4` |
| `ta_p_headandshoulders` | Head & Shoulders | `screener?v=111&s=ta_p_headandshoulders&ft=4` |
| `ta_p_headandshouldersinv` | Head & Shoulders Inverse | `screener?v=111&s=ta_p_headandshouldersinv&ft=4` |

## Refresh Behavior

- The helper script reads the `X-REFRESH-VERSION` response header and reloads the page if the version changes.
- The DOM fragments replaced on refresh are `screener-total`, `screener-page-select`, `screener_pagination`, and `screener-table`.

### Refreshed DOM fragments

| Logical name | DOM id |
| --- | --- |
| content | `screener-content` |
| total | `screener-total` |
| pageSelect | `screener-page-select` |
| pagination | `screener_pagination` |
| table | `screener-table` |
| emptyState | `js-screener-body-empty` |

## Combination Math

The public combination space is too large to enumerate inline, but it is finite for the dropdown-driven state model.

- Unique filters across all tabs: **107**
- Views: **16**
- Sort fields: **131**
- Signal states: **33**
- Public filter state count across all unique filter controls: **5,119,631,526,385,685,633,715,481,580,342,814,722,993,392,783,362,138,909,419,307,728,961,968,742,724,362,616,757,184,000,000,000,000,000,000,000,000,000,000**
- Public filter state count in scientific notation: **5.11963e+117**
- Primitive screen state count including view × signal × sort field × sort direction, but excluding ticker input, pagination, custom column payloads, and Elite-only custom filter editors: **708,229,346,834,090,207,825,664,859,898,303,617,520,013,984,079,184,848,173,429,353,993,682,907,993,517,426,951,721,805,824,000,000,000,000,000,000,000,000,000,000**
- Primitive screen state count in scientific notation: **7.08229e+122**

### Per-tab filter state counts

| Tab | Label | Filters | Public filter states | Scientific notation |
| --- | --- | --- | --- | --- |
| 1 | Descriptive | 22 | 17,827,952,734,193,991,379,200,000,000 | 1.78279e+28 |
| 2 | Fundamental | 37 | 42,835,072,238,225,047,271,643,542,057,316,989,340,000,000,000,000 | 4.28350e+49 |
| 3 | Technical | 20 | 313,616,745,637,020,058,647,960,000 | 3.13616e+26 |
| 4 | All | 88 | 5,119,631,526,385,685,633,715,481,580,342,814,722,993,392,783,362,138,909,419,307,728,961,968,742,724,362,616,757,184,000,000,000,000,000,000,000,000,000,000 | 5.11963e+117 |
| 5 | ETF | 26 | 1,644,353,287,500 | 1.64435e+12 |
| 6 | News | 2 | 13 | 13 |

## Filter Index

| Filter ID | Label | Tabs | Public options | Non-empty public options | Elite-only options | Disabled | Publicly queryable |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ah_change` | After-Hours Change | 4, 3 | 1 | 0 | 1 | No | No |
| `ah_close` | After-Hours Close | 4, 3 | 1 | 0 | 1 | No | No |
| `an_recom` | Analyst Recom. | 4, 1 | 10 | 9 | 1 | No | Yes |
| `cap` | Market Cap. | 4, 1 | 15 | 14 | 1 | No | Yes |
| `earningsdate` | Earnings Date | 4, 1 | 16 | 15 | 1 | No | Yes |
| `etf_active` | Active/Passive | 5 | 0 | 0 | 1 | Yes | No |
| `etf_assettype` | Asset Type | 4, 5 | 29 | 28 | 1 | No | Yes |
| `etf_bondmaturity` | Average Maturity | 5 | 0 | 0 | 1 | Yes | No |
| `etf_bondtype` | Bond Type | 5 | 0 | 0 | 1 | Yes | No |
| `etf_category` | Single Category | 4, 5 | 35 | 34 | 1 | No | Yes |
| `etf_commoditytype` | Commodity Type | 5 | 0 | 0 | 1 | Yes | No |
| `etf_currency` | Currency | 5 | 0 | 0 | 1 | Yes | No |
| `etf_developed` | Developed/Emerging | 5 | 0 | 0 | 1 | Yes | No |
| `etf_dividendtype` | Dividend Type | 5 | 0 | 0 | 1 | Yes | No |
| `etf_esgtype` | ESG Type | 5 | 0 | 0 | 1 | Yes | No |
| `etf_etftype` | ETF Type | 5 | 0 | 0 | 1 | Yes | No |
| `etf_fundflows` | Net Fund Flows | 4, 5 | 25 | 24 | 2 | No | Yes |
| `etf_growthvalue` | Growth/Value | 5 | 0 | 0 | 1 | Yes | No |
| `etf_heldby` | Held By | 5 | 0 | 0 | 1 | Yes | No |
| `etf_indexweight` | Index Weighting | 5 | 0 | 0 | 1 | Yes | No |
| `etf_inverse` | Inverse/Leveraged | 5 | 0 | 0 | 1 | Yes | No |
| `etf_mktcap` | Market Cap. (ETF) | 5 | 0 | 0 | 1 | Yes | No |
| `etf_nav` | Net Asset Value% | 5 | 0 | 0 | 1 | Yes | No |
| `etf_netexpense` | Net Expense Ratio | 4, 5 | 11 | 10 | 1 | No | Yes |
| `etf_quanttype` | Quant Type | 5 | 0 | 0 | 1 | Yes | No |
| `etf_region` | Region | 5 | 0 | 0 | 1 | Yes | No |
| `etf_return` | Annualized Return | 4, 5 | 25 | 24 | 2 | No | Yes |
| `etf_sectortheme` | Sector/Theme | 5 | 0 | 0 | 1 | Yes | No |
| `etf_sponsor` | Sponsor | 4, 5 | 438 | 437 | 1 | No | Yes |
| `etf_structuretype` | Structure Type | 5 | 0 | 0 | 1 | Yes | No |
| `etf_tags` | Tags | 4, 5 | 538 | 537 | 1 | No | Yes |
| `exch` | Exchange | 4, 1 | 5 | 4 | 1 | No | Yes |
| `fa_curratio` | Current Ratio | 4, 2 | 13 | 12 | 1 | No | Yes |
| `fa_debteq` | Debt/Equity | 4, 2 | 23 | 22 | 1 | No | Yes |
| `fa_div` | Dividend Yield | 4, 1 | 15 | 14 | 1 | No | Yes |
| `fa_divgrowth` | Dividend Growth | 4, 2 | 31 | 30 | 1 | No | Yes |
| `fa_eps3years` | EPS GrowthPast 3 Years | 4, 2 | 17 | 16 | 1 | No | Yes |
| `fa_eps5years` | EPS GrowthPast 5 Years | 4, 2 | 17 | 16 | 1 | No | Yes |
| `fa_epsqoq` | EPS GrowthQtr Over Qtr | 4, 2 | 17 | 16 | 1 | No | Yes |
| `fa_epsrev` | Earnings & Revenue Surprise | 4, 2 | 48 | 47 | 1 | No | Yes |
| `fa_epsyoy` | EPS GrowthThis Year | 4, 2 | 17 | 16 | 1 | No | Yes |
| `fa_epsyoy1` | EPS GrowthNext Year | 4, 2 | 17 | 16 | 1 | No | Yes |
| `fa_epsyoyttm` | EPS Growth TTM | 4, 2 | 17 | 16 | 1 | No | Yes |
| `fa_estltgrowth` | EPS GrowthNext 5 Years | 4, 2 | 17 | 16 | 1 | No | Yes |
| `fa_evebitda` | EV/EBITDA | 4, 2 | 25 | 24 | 1 | No | Yes |
| `fa_evsales` | EV/Sales | 4, 2 | 25 | 24 | 1 | No | Yes |
| `fa_fpe` | Forward P/E | 4, 2 | 24 | 23 | 1 | No | Yes |
| `fa_grossmargin` | Gross Margin | 4, 2 | 40 | 39 | 1 | No | Yes |
| `fa_ltdebteq` | LT Debt/Equity | 4, 2 | 23 | 22 | 1 | No | Yes |
| `fa_netmargin` | Net Profit Margin | 4, 2 | 41 | 40 | 1 | No | Yes |
| `fa_opermargin` | Operating Margin | 4, 2 | 41 | 40 | 1 | No | Yes |
| `fa_payoutratio` | Payout Ratio | 4, 2 | 26 | 25 | 1 | No | Yes |
| `fa_pb` | P/B | 4, 2 | 23 | 22 | 1 | No | Yes |
| `fa_pc` | Price/Cash | 4, 2 | 27 | 26 | 1 | No | Yes |
| `fa_pe` | P/E | 4, 2 | 24 | 23 | 1 | No | Yes |
| `fa_peg` | PEG | 4, 2 | 9 | 8 | 1 | No | Yes |
| `fa_pfcf` | Price/Free Cash Flow | 4, 2 | 33 | 32 | 1 | No | Yes |
| `fa_ps` | P/S | 4, 2 | 23 | 22 | 1 | No | Yes |
| `fa_quickratio` | Quick Ratio | 4, 2 | 13 | 12 | 1 | No | Yes |
| `fa_roa` | Return on Assets | 4, 2 | 25 | 24 | 1 | No | Yes |
| `fa_roe` | Return on Equity | 4, 2 | 25 | 24 | 1 | No | Yes |
| `fa_roi` | Return on Invested Capital | 4, 2 | 25 | 24 | 1 | No | Yes |
| `fa_sales3years` | Sales GrowthPast 3 Years | 4, 2 | 17 | 16 | 1 | No | Yes |
| `fa_sales5years` | Sales GrowthPast 5 Years | 4, 2 | 17 | 16 | 1 | No | Yes |
| `fa_salesqoq` | Sales GrowthQtr Over Qtr | 4, 2 | 17 | 16 | 1 | No | Yes |
| `fa_salesyoyttm` | Sales Growth TTM | 4, 2 | 17 | 16 | 1 | No | Yes |
| `geo` | Country | 4, 1 | 63 | 62 | 1 | No | Yes |
| `idx` | Index | 4, 1 | 5 | 4 | 1 | No | Yes |
| `ind` | Industry | 4, 1 | 152 | 151 | 1 | No | Yes |
| `ipodate` | IPO Date | 4, 1 | 16 | 15 | 1 | No | Yes |
| `news_date` | Latest News | 4, 6 | 13 | 12 | 1 | No | Yes |
| `news_keywords` | News Keywords | 4, 6 | 0 | 0 | 1 | Yes | No |
| `sec` | Sector | 4, 1 | 12 | 11 | 1 | No | Yes |
| `sh_avgvol` | Average Volume | 4, 1 | 19 | 18 | 1 | No | Yes |
| `sh_curvol` | Current Volume | 4, 1 | 29 | 28 | 1 | No | Yes |
| `sh_float` | Float | 4, 1 | 35 | 34 | 1 | No | Yes |
| `sh_insiderown` | InsiderOwnership | 4, 2 | 13 | 12 | 1 | No | Yes |
| `sh_insidertrans` | InsiderTransactions | 4, 2 | 33 | 32 | 1 | No | Yes |
| `sh_instown` | InstitutionalOwnership | 4, 2 | 21 | 20 | 1 | No | Yes |
| `sh_insttrans` | InstitutionalTransactions | 4, 2 | 25 | 24 | 1 | No | Yes |
| `sh_opt` | Option/Short | 4, 1 | 19 | 18 | 1 | No | Yes |
| `sh_outstanding` | Shares Outstanding | 4, 1 | 17 | 16 | 1 | No | Yes |
| `sh_price` | Price $ | 4, 1 | 41 | 40 | 1 | No | Yes |
| `sh_relvol` | Relative Volume | 4, 1 | 17 | 16 | 1 | No | Yes |
| `sh_short` | Short Float | 4, 1 | 15 | 14 | 1 | No | Yes |
| `sh_trades` | Trades | 4, 1 | 0 | 0 | 1 | Yes | No |
| `subtheme` | Sub-theme | 4, 1 | 269 | 268 | 1 | No | Yes |
| `ta_alltime` | All-Time High/Low | 4, 3 | 37 | 36 | 1 | No | Yes |
| `ta_averagetruerange` | Average True Range | 4, 3 | 25 | 24 | 1 | No | Yes |
| `ta_beta` | Beta | 4, 3 | 20 | 19 | 1 | No | Yes |
| `ta_candlestick` | Candlestick | 4, 3 | 12 | 11 | 1 | No | Yes |
| `ta_change` | Change | 4, 3 | 27 | 26 | 1 | No | Yes |
| `ta_changeopen` | Change from Open | 4, 3 | 27 | 26 | 1 | No | Yes |
| `ta_gap` | Gap | 4, 3 | 29 | 28 | 1 | No | Yes |
| `ta_highlow20d` | 20-Day High/Low | 4, 3 | 23 | 22 | 1 | No | Yes |
| `ta_highlow50d` | 50-Day High/Low | 4, 3 | 23 | 22 | 1 | No | Yes |
| `ta_highlow52w` | 52-Week High/Low | 4, 3 | 37 | 36 | 1 | No | Yes |
| `ta_pattern` | Pattern | 4, 3 | 29 | 28 | 1 | No | Yes |
| `ta_perf` | Performance | 4, 3 | 129 | 128 | 2 | No | Yes |
| `ta_perf2` | Performance 2 | 4, 3 | 129 | 128 | 2 | No | Yes |
| `ta_rsi` | RSI (14) | 4, 3 | 13 | 12 | 1 | No | Yes |
| `ta_sma20` | 20-Day Simple Moving Average | 4, 3 | 26 | 25 | 1 | No | Yes |
| `ta_sma200` | 200-Day Simple Moving Average | 4, 3 | 35 | 34 | 1 | No | Yes |
| `ta_sma50` | 50-Day Simple Moving Average | 4, 3 | 26 | 25 | 1 | No | Yes |
| `ta_volatility` | Volatility | 4, 3 | 23 | 22 | 1 | No | Yes |
| `targetprice` | Target Price | 4, 1 | 15 | 14 | 1 | No | Yes |
| `theme` | Theme | 4, 1 | 41 | 40 | 1 | No | Yes |

## Screenshot Tab Coverage

This table maps the visible filter labels in the six screenshots to the actual Finviz filter ids. `Public` means a non-empty dropdown value can be encoded into `f=` without an Elite session. `Disabled` and `Elite-only/no public values` mean the control is visible/documented, but the current public page does not expose usable public values.

| Tab | Visible label | Filter ID | Support | Public values |
| --- | --- | --- | --- | --- |
| Descriptive | Exchange | `exch` | Public | 4 |
| Descriptive | Index | `idx` | Public | 4 |
| Descriptive | Sector | `sec` | Public | 11 |
| Descriptive | Industry | `ind` | Public | 151 |
| Descriptive | Country | `geo` | Public | 62 |
| Descriptive | Market Cap. | `cap` | Public | 14 |
| Descriptive | Dividend Yield | `fa_div` | Public | 14 |
| Descriptive | Short Float | `sh_short` | Public | 14 |
| Descriptive | Analyst Recom. | `an_recom` | Public | 9 |
| Descriptive | Option/Short | `sh_opt` | Public | 18 |
| Descriptive | Earnings Date | `earningsdate` | Public | 15 |
| Descriptive | Average Volume | `sh_avgvol` | Public | 18 |
| Descriptive | Relative Volume | `sh_relvol` | Public | 16 |
| Descriptive | Current Volume | `sh_curvol` | Public | 28 |
| Descriptive | Trades | `sh_trades` | Disabled | 0 |
| Descriptive | Price $ | `sh_price` | Public | 40 |
| Descriptive | Target Price | `targetprice` | Public | 14 |
| Descriptive | IPO Date | `ipodate` | Public | 15 |
| Descriptive | Shares Outstanding | `sh_outstanding` | Public | 16 |
| Descriptive | Float | `sh_float` | Public | 34 |
| Descriptive | Theme | `theme` | Public | 40 |
| Descriptive | Sub-theme | `subtheme` | Public | 268 |
| Fundamental | P/E | `fa_pe` | Public | 23 |
| Fundamental | Forward P/E | `fa_fpe` | Public | 23 |
| Fundamental | PEG | `fa_peg` | Public | 8 |
| Fundamental | P/S | `fa_ps` | Public | 22 |
| Fundamental | P/B | `fa_pb` | Public | 22 |
| Fundamental | Price/Cash | `fa_pc` | Public | 26 |
| Fundamental | Price/Free Cash Flow | `fa_pfcf` | Public | 32 |
| Fundamental | EV/EBITDA | `fa_evebitda` | Public | 24 |
| Fundamental | EV/Sales | `fa_evsales` | Public | 24 |
| Fundamental | Dividend Growth | `fa_divgrowth` | Public | 30 |
| Fundamental | EPS GrowthThis Year | `fa_epsyoy` | Public | 16 |
| Fundamental | EPS GrowthNext Year | `fa_epsyoy1` | Public | 16 |
| Fundamental | EPS GrowthQtr Over Qtr | `fa_epsqoq` | Public | 16 |
| Fundamental | EPS Growth TTM | `fa_epsyoyttm` | Public | 16 |
| Fundamental | EPS GrowthPast 3 Years | `fa_eps3years` | Public | 16 |
| Fundamental | EPS GrowthPast 5 Years | `fa_eps5years` | Public | 16 |
| Fundamental | EPS GrowthNext 5 Years | `fa_estltgrowth` | Public | 16 |
| Fundamental | Sales GrowthQtr Over Qtr | `fa_salesqoq` | Public | 16 |
| Fundamental | Sales Growth TTM | `fa_salesyoyttm` | Public | 16 |
| Fundamental | Sales GrowthPast 3 Years | `fa_sales3years` | Public | 16 |
| Fundamental | Sales GrowthPast 5 Years | `fa_sales5years` | Public | 16 |
| Fundamental | Earnings & Revenue Surprise | `fa_epsrev` | Public | 47 |
| Fundamental | Return on Assets | `fa_roa` | Public | 24 |
| Fundamental | Return on Equity | `fa_roe` | Public | 24 |
| Fundamental | Return on Invested Capital | `fa_roi` | Public | 24 |
| Fundamental | Current Ratio | `fa_curratio` | Public | 12 |
| Fundamental | Quick Ratio | `fa_quickratio` | Public | 12 |
| Fundamental | LT Debt/Equity | `fa_ltdebteq` | Public | 22 |
| Fundamental | Debt/Equity | `fa_debteq` | Public | 22 |
| Fundamental | Gross Margin | `fa_grossmargin` | Public | 39 |
| Fundamental | Operating Margin | `fa_opermargin` | Public | 40 |
| Fundamental | Net Profit Margin | `fa_netmargin` | Public | 40 |
| Fundamental | Payout Ratio | `fa_payoutratio` | Public | 25 |
| Fundamental | InsiderOwnership | `sh_insiderown` | Public | 12 |
| Fundamental | InsiderTransactions | `sh_insidertrans` | Public | 32 |
| Fundamental | InstitutionalOwnership | `sh_instown` | Public | 20 |
| Fundamental | InstitutionalTransactions | `sh_insttrans` | Public | 24 |
| Technical | Performance | `ta_perf` | Public | 128 |
| Technical | Performance 2 | `ta_perf2` | Public | 128 |
| Technical | Volatility | `ta_volatility` | Public | 22 |
| Technical | RSI (14) | `ta_rsi` | Public | 12 |
| Technical | Gap | `ta_gap` | Public | 28 |
| Technical | 20-Day Simple Moving Average | `ta_sma20` | Public | 25 |
| Technical | 50-Day Simple Moving Average | `ta_sma50` | Public | 25 |
| Technical | 200-Day Simple Moving Average | `ta_sma200` | Public | 34 |
| Technical | Change | `ta_change` | Public | 26 |
| Technical | Change from Open | `ta_changeopen` | Public | 26 |
| Technical | 20-Day High/Low | `ta_highlow20d` | Public | 22 |
| Technical | 50-Day High/Low | `ta_highlow50d` | Public | 22 |
| Technical | 52-Week High/Low | `ta_highlow52w` | Public | 36 |
| Technical | All-Time High/Low | `ta_alltime` | Public | 36 |
| Technical | Pattern | `ta_pattern` | Public | 28 |
| Technical | Candlestick | `ta_candlestick` | Public | 11 |
| Technical | Beta | `ta_beta` | Public | 19 |
| Technical | Average True Range | `ta_averagetruerange` | Public | 24 |
| Technical | After-Hours Close | `ah_close` | Elite-only/no public values | 0 |
| Technical | After-Hours Change | `ah_change` | Elite-only/no public values | 0 |
| All | Exchange | `exch` | Public | 4 |
| All | Index | `idx` | Public | 4 |
| All | Sector | `sec` | Public | 11 |
| All | Industry | `ind` | Public | 151 |
| All | Country | `geo` | Public | 62 |
| All | Market Cap. | `cap` | Public | 14 |
| All | P/E | `fa_pe` | Public | 23 |
| All | Forward P/E | `fa_fpe` | Public | 23 |
| All | PEG | `fa_peg` | Public | 8 |
| All | P/S | `fa_ps` | Public | 22 |
| All | P/B | `fa_pb` | Public | 22 |
| All | Price/Cash | `fa_pc` | Public | 26 |
| All | Price/Free Cash Flow | `fa_pfcf` | Public | 32 |
| All | EV/EBITDA | `fa_evebitda` | Public | 24 |
| All | EV/Sales | `fa_evsales` | Public | 24 |
| All | Dividend Growth | `fa_divgrowth` | Public | 30 |
| All | EPS GrowthThis Year | `fa_epsyoy` | Public | 16 |
| All | EPS GrowthNext Year | `fa_epsyoy1` | Public | 16 |
| All | EPS GrowthQtr Over Qtr | `fa_epsqoq` | Public | 16 |
| All | EPS Growth TTM | `fa_epsyoyttm` | Public | 16 |
| All | EPS GrowthPast 3 Years | `fa_eps3years` | Public | 16 |
| All | EPS GrowthPast 5 Years | `fa_eps5years` | Public | 16 |
| All | EPS GrowthNext 5 Years | `fa_estltgrowth` | Public | 16 |
| All | Sales GrowthQtr Over Qtr | `fa_salesqoq` | Public | 16 |
| All | Sales Growth TTM | `fa_salesyoyttm` | Public | 16 |
| All | Sales GrowthPast 3 Years | `fa_sales3years` | Public | 16 |
| All | Sales GrowthPast 5 Years | `fa_sales5years` | Public | 16 |
| All | Earnings & Revenue Surprise | `fa_epsrev` | Public | 47 |
| All | Dividend Yield | `fa_div` | Public | 14 |
| All | Return on Assets | `fa_roa` | Public | 24 |
| All | Return on Equity | `fa_roe` | Public | 24 |
| All | Return on Invested Capital | `fa_roi` | Public | 24 |
| All | Current Ratio | `fa_curratio` | Public | 12 |
| All | Quick Ratio | `fa_quickratio` | Public | 12 |
| All | LT Debt/Equity | `fa_ltdebteq` | Public | 22 |
| All | Debt/Equity | `fa_debteq` | Public | 22 |
| All | Gross Margin | `fa_grossmargin` | Public | 39 |
| All | Operating Margin | `fa_opermargin` | Public | 40 |
| All | Net Profit Margin | `fa_netmargin` | Public | 40 |
| All | Payout Ratio | `fa_payoutratio` | Public | 25 |
| All | InsiderOwnership | `sh_insiderown` | Public | 12 |
| All | InsiderTransactions | `sh_insidertrans` | Public | 32 |
| All | InstitutionalOwnership | `sh_instown` | Public | 20 |
| All | InstitutionalTransactions | `sh_insttrans` | Public | 24 |
| All | Short Float | `sh_short` | Public | 14 |
| All | Analyst Recom. | `an_recom` | Public | 9 |
| All | Option/Short | `sh_opt` | Public | 18 |
| All | Earnings Date | `earningsdate` | Public | 15 |
| All | Performance | `ta_perf` | Public | 128 |
| All | Performance 2 | `ta_perf2` | Public | 128 |
| All | Volatility | `ta_volatility` | Public | 22 |
| All | RSI (14) | `ta_rsi` | Public | 12 |
| All | Gap | `ta_gap` | Public | 28 |
| All | 20-Day Simple Moving Average | `ta_sma20` | Public | 25 |
| All | 50-Day Simple Moving Average | `ta_sma50` | Public | 25 |
| All | 200-Day Simple Moving Average | `ta_sma200` | Public | 34 |
| All | Change | `ta_change` | Public | 26 |
| All | Change from Open | `ta_changeopen` | Public | 26 |
| All | 20-Day High/Low | `ta_highlow20d` | Public | 22 |
| All | 50-Day High/Low | `ta_highlow50d` | Public | 22 |
| All | 52-Week High/Low | `ta_highlow52w` | Public | 36 |
| All | All-Time High/Low | `ta_alltime` | Public | 36 |
| All | Pattern | `ta_pattern` | Public | 28 |
| All | Candlestick | `ta_candlestick` | Public | 11 |
| All | Beta | `ta_beta` | Public | 19 |
| All | Average True Range | `ta_averagetruerange` | Public | 24 |
| All | Average Volume | `sh_avgvol` | Public | 18 |
| All | Relative Volume | `sh_relvol` | Public | 16 |
| All | Current Volume | `sh_curvol` | Public | 28 |
| All | Trades | `sh_trades` | Disabled | 0 |
| All | Price $ | `sh_price` | Public | 40 |
| All | Target Price | `targetprice` | Public | 14 |
| All | IPO Date | `ipodate` | Public | 15 |
| All | Shares Outstanding | `sh_outstanding` | Public | 16 |
| All | Float | `sh_float` | Public | 34 |
| All | Theme | `theme` | Public | 40 |
| All | Sub-theme | `subtheme` | Public | 268 |
| All | After-Hours Close | `ah_close` | Elite-only/no public values | 0 |
| All | After-Hours Change | `ah_change` | Elite-only/no public values | 0 |
| All | Latest News | `news_date` | Public | 12 |
| All | News Keywords | `news_keywords` | Disabled | 0 |
| All | Single Category | `etf_category` | Public | 34 |
| All | Asset Type | `etf_assettype` | Public | 28 |
| All | Sponsor | `etf_sponsor` | Public | 437 |
| All | Net Expense Ratio | `etf_netexpense` | Public | 10 |
| All | Net Fund Flows | `etf_fundflows` | Public | 24 |
| All | Annualized Return | `etf_return` | Public | 24 |
| All | Tags | `etf_tags` | Public | 537 |
| ETF | Single Category | `etf_category` | Public | 34 |
| ETF | Asset Type | `etf_assettype` | Public | 28 |
| ETF | ETF Type | `etf_etftype` | Disabled | 0 |
| ETF | Sector/Theme | `etf_sectortheme` | Disabled | 0 |
| ETF | Region | `etf_region` | Disabled | 0 |
| ETF | Bond Type | `etf_bondtype` | Disabled | 0 |
| ETF | Average Maturity | `etf_bondmaturity` | Disabled | 0 |
| ETF | Quant Type | `etf_quanttype` | Disabled | 0 |
| ETF | Commodity Type | `etf_commoditytype` | Disabled | 0 |
| ETF | ESG Type | `etf_esgtype` | Disabled | 0 |
| ETF | Dividend Type | `etf_dividendtype` | Disabled | 0 |
| ETF | Structure Type | `etf_structuretype` | Disabled | 0 |
| ETF | Active/Passive | `etf_active` | Disabled | 0 |
| ETF | Inverse/Leveraged | `etf_inverse` | Disabled | 0 |
| ETF | Growth/Value | `etf_growthvalue` | Disabled | 0 |
| ETF | Market Cap. (ETF) | `etf_mktcap` | Disabled | 0 |
| ETF | Developed/Emerging | `etf_developed` | Disabled | 0 |
| ETF | Currency | `etf_currency` | Disabled | 0 |
| ETF | Index Weighting | `etf_indexweight` | Disabled | 0 |
| ETF | Sponsor | `etf_sponsor` | Public | 437 |
| ETF | Net Expense Ratio | `etf_netexpense` | Public | 10 |
| ETF | Net Fund Flows | `etf_fundflows` | Public | 24 |
| ETF | Annualized Return | `etf_return` | Public | 24 |
| ETF | Net Asset Value% | `etf_nav` | Disabled | 0 |
| ETF | Tags | `etf_tags` | Public | 537 |
| ETF | Held By | `etf_heldby` | Disabled | 0 |
| News | Latest News | `news_date` | Public | 12 |
| News | News Keywords | `news_keywords` | Disabled | 0 |

## Full Filter Catalog

### `ah_change`

| Field | Value |
| --- | --- |
| Label | After-Hours Change |
| Control ID | fs_ah_change |
| Control type | select |
| Tabs | 4, 3 |
| Disabled | No |
| Publicly queryable | No |
| Public options | 1 |
| Non-empty public options | 0 |
| Elite-only options | 1 |
| Template | `v=111&f=ah_change_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Custom (Elite only) | (empty) | Yes |

### `ah_close`

| Field | Value |
| --- | --- |
| Label | After-Hours Close |
| Control ID | fs_ah_close |
| Control type | select |
| Tabs | 4, 3 |
| Disabled | No |
| Publicly queryable | No |
| Public options | 1 |
| Non-empty public options | 0 |
| Elite-only options | 1 |
| Template | `v=111&f=ah_close_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Custom (Elite only) | (empty) | Yes |

### `an_recom`

| Field | Value |
| --- | --- |
| Label | Analyst Recom. |
| Control ID | fs_an_recom |
| Control type | select |
| Tabs | 4, 1 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 10 |
| Non-empty public options | 9 |
| Elite-only options | 1 |
| Template | `v=111&f=an_recom_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Strong Buy (1) | `strongbuy` | No |
| Buy or better | `buybetter` | No |
| Buy | `buy` | No |
| Hold or better | `holdbetter` | No |
| Hold | `hold` | No |
| Hold or worse | `holdworse` | No |
| Sell | `sell` | No |
| Sell or worse | `sellworse` | No |
| Strong Sell (5) | `strongsell` | No |
| Custom (Elite only) | (empty) | Yes |

### `cap`

| Field | Value |
| --- | --- |
| Label | Market Cap. |
| Control ID | fs_cap |
| Control type | select |
| Tabs | 4, 1 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 15 |
| Non-empty public options | 14 |
| Elite-only options | 1 |
| Template | `v=111&f=cap_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Mega ($200bln and more) | `mega` | No |
| Large ($10bln to $200bln) | `large` | No |
| Mid ($2bln to $10bln) | `mid` | No |
| Small ($300mln to $2bln) | `small` | No |
| Micro ($50mln to $300mln) | `micro` | No |
| Nano (under $50mln) | `nano` | No |
| +Large (over $10bln) | `largeover` | No |
| +Mid (over $2bln) | `midover` | No |
| +Small (over $300mln) | `smallover` | No |
| +Micro (over $50mln) | `microover` | No |
| -Large (under $200bln) | `largeunder` | No |
| -Mid (under $10bln) | `midunder` | No |
| -Small (under $2bln) | `smallunder` | No |
| -Micro (under $300mln) | `microunder` | No |
| Custom (Elite only) | (empty) | Yes |

### `earningsdate`

| Field | Value |
| --- | --- |
| Label | Earnings Date |
| Control ID | fs_earningsdate |
| Control type | select |
| Tabs | 4, 1 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 16 |
| Non-empty public options | 15 |
| Elite-only options | 1 |
| Template | `v=111&f=earningsdate_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Today | `today` | No |
| Today Before Market Open | `todaybefore` | No |
| Today After Market Close | `todayafter` | No |
| Tomorrow | `tomorrow` | No |
| Tomorrow Before Market Open | `tomorrowbefore` | No |
| Tomorrow After Market Close | `tomorrowafter` | No |
| Yesterday | `yesterday` | No |
| Yesterday Before Market Open | `yesterdaybefore` | No |
| Yesterday After Market Close | `yesterdayafter` | No |
| Next 5 Days | `nextdays5` | No |
| Previous 5 Days | `prevdays5` | No |
| This Week | `thisweek` | No |
| Next Week | `nextweek` | No |
| Previous Week | `prevweek` | No |
| This Month | `thismonth` | No |
| Custom (Elite only) | (empty) | Yes |

### `etf_active`

| Field | Value |
| --- | --- |
| Label | Active/Passive |
| Control ID | fs_etf_active |
| Control type | select |
| Tabs | 5 |
| Disabled | Yes |
| Publicly queryable | No |
| Public options | 0 |
| Non-empty public options | 0 |
| Elite-only options | 1 |
| Template | `v=111&f=etf_active_selected_filter&ft=5` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Elite only | (empty) | Yes |

### `etf_assettype`

| Field | Value |
| --- | --- |
| Label | Asset Type |
| Control ID | fs_etf_assettype |
| Control type | select |
| Tabs | 4, 5 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 29 |
| Non-empty public options | 28 |
| Elite-only options | 1 |
| Template | `v=111&f=etf_assettype_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Bonds | `bonds` | No |
| Carbon Trading | `carbontrading` | No |
| Closed End Funds | `closedendfunds` | No |
| Commodities & Metals | `commoditiesmetals` | No |
| CryptoCurrency | `cryptocurrency` | No |
| Currency | `currency` | No |
| Equities (Stocks) | `equitiesstocks` | No |
| Equities (Stocks) - IPO Based | `equitiesstocksipobased` | No |
| Freight Futures | `freightfutures` | No |
| Hedge Fund Replication | `hedgefundreplication` | No |
| MLP | `mlp` | No |
| Multi-Asset - Conservative | `multiassetconservative` | No |
| Multi-Asset - Growth / Aggressive | `multiassetgrowthaggressive` | No |
| Multi-Asset - Moderate | `multiassetmoderate` | No |
| Multi-Asset - Spread Between Asset Classes | `multiassetspreadbetweenassetclasses` | No |
| Multi-Asset - Tactical / Active | `multiassettacticalactive` | No |
| Multi-AssetTarget Date - 2030 | `multiassettargetdate2030` | No |
| Multi-AssetTarget Date - 2035 | `multiassettargetdate2035` | No |
| Multi-AssetTarget Date - 2040 | `multiassettargetdate2040` | No |
| Multi-AssetTarget Date - 2045 | `multiassettargetdate2045` | No |
| Multi-AssetTarget Date - 2050 | `multiassettargetdate2050` | No |
| Multi-AssetTarget Date - 2055 | `multiassettargetdate2055` | No |
| Multi-AssetTarget Date - 2060 | `multiassettargetdate2060` | No |
| Multi-AssetTarget Date - 2065 | `multiassettargetdate2065` | No |
| Multi-AssetTarget Date - 2070 | `multiassettargetdate2070` | No |
| Preferred Stock | `preferredstock` | No |
| Private Equity | `privateequity` | No |
| SPAC | `spac` | No |
| Custom (Elite only) | (empty) | Yes |

### `etf_bondmaturity`

| Field | Value |
| --- | --- |
| Label | Average Maturity |
| Control ID | fs_etf_bondmaturity |
| Control type | select |
| Tabs | 5 |
| Disabled | Yes |
| Publicly queryable | No |
| Public options | 0 |
| Non-empty public options | 0 |
| Elite-only options | 1 |
| Template | `v=111&f=etf_bondmaturity_selected_filter&ft=5` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Elite only | (empty) | Yes |

### `etf_bondtype`

| Field | Value |
| --- | --- |
| Label | Bond Type |
| Control ID | fs_etf_bondtype |
| Control type | select |
| Tabs | 5 |
| Disabled | Yes |
| Publicly queryable | No |
| Public options | 0 |
| Non-empty public options | 0 |
| Elite-only options | 1 |
| Template | `v=111&f=etf_bondtype_selected_filter&ft=5` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Elite only | (empty) | Yes |

### `etf_category`

| Field | Value |
| --- | --- |
| Label | Single Category |
| Control ID | fs_etf_category |
| Control type | select |
| Tabs | 4, 5 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 35 |
| Non-empty public options | 34 |
| Elite-only options | 1 |
| Template | `v=111&f=etf_category_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Bonds - Broad Market | `bondsbroadmarket` | No |
| Bonds - Convertible | `bondsconvertible` | No |
| Bonds - Corporate | `bondscorporate` | No |
| Bonds - Inflation protected | `bondsinflationprotected` | No |
| Bonds - Leveraged / Inverse | `bondsleveragedinverse` | No |
| Bonds - Money Market | `bondsmoneymarket` | No |
| Bonds - Mortgage | `bondsmortgage` | No |
| Bonds - Municipal | `bondsmunicipal` | No |
| Bonds - Non Government Asset Backed Securities | `bondsnongovernmentassetbackedsecurities` | No |
| Bonds - Treasury & Government | `bondstreasurygovernment` | No |
| Commodities & Metals - Agricultural | `commoditiesmetalsagricultural` | No |
| Commodities & Metals - Diversified Commodities | `commoditiesmetalsdiversifiedcommodities` | No |
| Commodities & Metals - Energy | `commoditiesmetalsenergy` | No |
| Commodities & Metals - Gold / Metals | `commoditiesmetalsgoldmetals` | No |
| Commodities & Metals - Leveraged / Inverse | `commoditiesmetalsleveragedinverse` | No |
| Currency | `currency` | No |
| Currency - Leveraged / Inverse | `currencyleveragedinverse` | No |
| Equity - Leveraged / Inverse | `equityleveragedinverse` | No |
| Global or ExUS Equities - Broad / Regional | `globalorexusequitiesbroadregional` | No |
| Global or ExUS Equities - Country Specific | `globalorexusequitiescountryspecific` | No |
| Global or ExUS Equities - Dividend & Fundamental | `globalorexusequitiesdividendfundamental` | No |
| Global or ExUS Equities - Factor & Thematic | `globalorexusequitiesfactorthematic` | No |
| Global or ExUS Equities - Industry Sector | `globalorexusequitiesindustrysector` | No |
| Global or ExUS Equities - Quant Strat | `globalorexusequitiesquantstrat` | No |
| Other Asset Types - Leveraged / Inverse | `otherassettypesleveragedinverse` | No |
| Other Asset Types - Multi-Asset / Other | `otherassettypesmultiassetother` | No |
| Target Date / Multi-Asset - Leveraged / Inverse | `targetdatemultiassetleveragedinverse` | No |
| Target Date / Multi-Asset - Other | `targetdatemultiassetother` | No |
| US Equities - Broad Market & Size | `usequitiesbroadmarketsize` | No |
| US Equities - Dividend & Fundamental | `usequitiesdividendfundamental` | No |
| US Equities - Factor & Thematic | `usequitiesfactorthematic` | No |
| US Equities - Industry Sector | `usequitiesindustrysector` | No |
| US Equities - Quant Strat | `usequitiesquantstrat` | No |
| US Equities - US Style | `usequitiesusstyle` | No |
| Custom (Elite only) | (empty) | Yes |

### `etf_commoditytype`

| Field | Value |
| --- | --- |
| Label | Commodity Type |
| Control ID | fs_etf_commoditytype |
| Control type | select |
| Tabs | 5 |
| Disabled | Yes |
| Publicly queryable | No |
| Public options | 0 |
| Non-empty public options | 0 |
| Elite-only options | 1 |
| Template | `v=111&f=etf_commoditytype_selected_filter&ft=5` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Elite only | (empty) | Yes |

### `etf_currency`

| Field | Value |
| --- | --- |
| Label | Currency |
| Control ID | fs_etf_currency |
| Control type | select |
| Tabs | 5 |
| Disabled | Yes |
| Publicly queryable | No |
| Public options | 0 |
| Non-empty public options | 0 |
| Elite-only options | 1 |
| Template | `v=111&f=etf_currency_selected_filter&ft=5` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Elite only | (empty) | Yes |

### `etf_developed`

| Field | Value |
| --- | --- |
| Label | Developed/Emerging |
| Control ID | fs_etf_developed |
| Control type | select |
| Tabs | 5 |
| Disabled | Yes |
| Publicly queryable | No |
| Public options | 0 |
| Non-empty public options | 0 |
| Elite-only options | 1 |
| Template | `v=111&f=etf_developed_selected_filter&ft=5` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Elite only | (empty) | Yes |

### `etf_dividendtype`

| Field | Value |
| --- | --- |
| Label | Dividend Type |
| Control ID | fs_etf_dividendtype |
| Control type | select |
| Tabs | 5 |
| Disabled | Yes |
| Publicly queryable | No |
| Public options | 0 |
| Non-empty public options | 0 |
| Elite-only options | 1 |
| Template | `v=111&f=etf_dividendtype_selected_filter&ft=5` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Elite only | (empty) | Yes |

### `etf_esgtype`

| Field | Value |
| --- | --- |
| Label | ESG Type |
| Control ID | fs_etf_esgtype |
| Control type | select |
| Tabs | 5 |
| Disabled | Yes |
| Publicly queryable | No |
| Public options | 0 |
| Non-empty public options | 0 |
| Elite-only options | 1 |
| Template | `v=111&f=etf_esgtype_selected_filter&ft=5` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Elite only | (empty) | Yes |

### `etf_etftype`

| Field | Value |
| --- | --- |
| Label | ETF Type |
| Control ID | fs_etf_etftype |
| Control type | select |
| Tabs | 5 |
| Disabled | Yes |
| Publicly queryable | No |
| Public options | 0 |
| Non-empty public options | 0 |
| Elite-only options | 1 |
| Template | `v=111&f=etf_etftype_selected_filter&ft=5` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Elite only | (empty) | Yes |

### `etf_fundflows`

| Field | Value |
| --- | --- |
| Label | Net Fund Flows |
| Control ID | fs_etf_fundflows |
| Control type | select |
| Tabs | 4, 5 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 25 |
| Non-empty public options | 24 |
| Elite-only options | 2 |
| Template | `v=111&f=etf_fundflows_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| 1 Month - Over 0% | `1mo0` | No |
| 1 Month - Over 10% | `1mo10` | No |
| 1 Month - Over 25% | `1mo25` | No |
| 1 Month - Over 50% | `1mo50` | No |
| 1 Month - Under 0% | `1mu0` | No |
| 1 Month - Under -10% | `1mu10` | No |
| 1 Month - Under -25% | `1mu25` | No |
| 1 Month - Under -50% | `1mu50` | No |
| 3 Month - Over 0% | `3mo0` | No |
| 3 Month - Over 10% | `3mo10` | No |
| 3 Month - Over 25% | `3mo25` | No |
| 3 Month - Over 50% | `3mo50` | No |
| 3 Month - Under 0% | `3mu0` | No |
| 3 Month - Under -10% | `3mu10` | No |
| 3 Month - Under -25% | `3mu25` | No |
| 3 Month - Under -50% | `3mu50` | No |
| YTD - Over 0% | `ytdo0` | No |
| YTD - Over 10% | `ytdo10` | No |
| YTD - Over 25% | `ytdo25` | No |
| YTD - Over 50% | `ytdo50` | No |
| YTD - Under 0% | `ytdu0` | No |
| YTD - Under -10% | `ytdu10` | No |
| YTD - Under -25% | `ytdu25` | No |
| YTD - Under -50% | `ytdu50` | No |
| More (Elite only) | (empty) | Yes |
| Custom (Elite only) | (empty) | Yes |

### `etf_growthvalue`

| Field | Value |
| --- | --- |
| Label | Growth/Value |
| Control ID | fs_etf_growthvalue |
| Control type | select |
| Tabs | 5 |
| Disabled | Yes |
| Publicly queryable | No |
| Public options | 0 |
| Non-empty public options | 0 |
| Elite-only options | 1 |
| Template | `v=111&f=etf_growthvalue_selected_filter&ft=5` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Elite only | (empty) | Yes |

### `etf_heldby`

| Field | Value |
| --- | --- |
| Label | Held By |
| Control ID | ft_etf_heldby |
| Control type | input |
| Tabs | 5 |
| Disabled | Yes |
| Publicly queryable | No |
| Public options | 0 |
| Non-empty public options | 0 |
| Elite-only options | 1 |
| Template | `v=111&f=etf_heldby_SELECTED-FILTER&ft=5` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Elite only | `Elite only` | Yes |

### `etf_indexweight`

| Field | Value |
| --- | --- |
| Label | Index Weighting |
| Control ID | fs_etf_indexweight |
| Control type | select |
| Tabs | 5 |
| Disabled | Yes |
| Publicly queryable | No |
| Public options | 0 |
| Non-empty public options | 0 |
| Elite-only options | 1 |
| Template | `v=111&f=etf_indexweight_selected_filter&ft=5` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Elite only | (empty) | Yes |

### `etf_inverse`

| Field | Value |
| --- | --- |
| Label | Inverse/Leveraged |
| Control ID | fs_etf_inverse |
| Control type | select |
| Tabs | 5 |
| Disabled | Yes |
| Publicly queryable | No |
| Public options | 0 |
| Non-empty public options | 0 |
| Elite-only options | 1 |
| Template | `v=111&f=etf_inverse_selected_filter&ft=5` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Elite only | (empty) | Yes |

### `etf_mktcap`

| Field | Value |
| --- | --- |
| Label | Market Cap. (ETF) |
| Control ID | fs_etf_mktcap |
| Control type | select |
| Tabs | 5 |
| Disabled | Yes |
| Publicly queryable | No |
| Public options | 0 |
| Non-empty public options | 0 |
| Elite-only options | 1 |
| Template | `v=111&f=etf_mktcap_selected_filter&ft=5` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Elite only | (empty) | Yes |

### `etf_nav`

| Field | Value |
| --- | --- |
| Label | Net Asset Value% |
| Control ID | fs_etf_nav |
| Control type | select |
| Tabs | 5 |
| Disabled | Yes |
| Publicly queryable | No |
| Public options | 0 |
| Non-empty public options | 0 |
| Elite-only options | 1 |
| Template | `v=111&f=etf_nav_selected_filter&ft=5` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Elite only | (empty) | Yes |

### `etf_netexpense`

| Field | Value |
| --- | --- |
| Label | Net Expense Ratio |
| Control ID | fs_etf_netexpense |
| Control type | select |
| Tabs | 4, 5 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 11 |
| Non-empty public options | 10 |
| Elite-only options | 1 |
| Template | `v=111&f=etf_netexpense_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Under 0.1% | `u01` | No |
| Under 0.2% | `u02` | No |
| Under 0.3% | `u03` | No |
| Under 0.4% | `u04` | No |
| Under 0.5% | `u05` | No |
| Under 0.6% | `u06` | No |
| Under 0.7% | `u07` | No |
| Under 0.8% | `u08` | No |
| Under 0.9% | `u09` | No |
| Under 1.0% | `u10` | No |
| Custom (Elite only) | (empty) | Yes |

### `etf_quanttype`

| Field | Value |
| --- | --- |
| Label | Quant Type |
| Control ID | fs_etf_quanttype |
| Control type | select |
| Tabs | 5 |
| Disabled | Yes |
| Publicly queryable | No |
| Public options | 0 |
| Non-empty public options | 0 |
| Elite-only options | 1 |
| Template | `v=111&f=etf_quanttype_selected_filter&ft=5` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Elite only | (empty) | Yes |

### `etf_region`

| Field | Value |
| --- | --- |
| Label | Region |
| Control ID | fs_etf_region |
| Control type | select |
| Tabs | 5 |
| Disabled | Yes |
| Publicly queryable | No |
| Public options | 0 |
| Non-empty public options | 0 |
| Elite-only options | 1 |
| Template | `v=111&f=etf_region_selected_filter&ft=5` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Elite only | (empty) | Yes |

### `etf_return`

| Field | Value |
| --- | --- |
| Label | Annualized Return |
| Control ID | fs_etf_return |
| Control type | select |
| Tabs | 4, 5 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 25 |
| Non-empty public options | 24 |
| Elite-only options | 2 |
| Template | `v=111&f=etf_return_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| 1 Year - Over 0% | `1yo0` | No |
| 1 Year - Over 5% | `1yo05` | No |
| 1 Year - Over 10% | `1yo10` | No |
| 1 Year - Over 25% | `1yo25` | No |
| 1 Year - Under 0% | `1yu0` | No |
| 1 Year - Under -5% | `1yu05` | No |
| 1 Year - Under -10% | `1yu10` | No |
| 1 Year - Under -25% | `1yu25` | No |
| 3 Year - Over 0% | `3yo0` | No |
| 3 Year - Over 5% | `3yo05` | No |
| 3 Year - Over 10% | `3yo10` | No |
| 3 Year - Over 25% | `3yo25` | No |
| 3 Year - Under 0% | `3yu0` | No |
| 3 Year - Under -5% | `3yu05` | No |
| 3 Year - Under -10% | `3yu10` | No |
| 3 Year - Under -25% | `3yu25` | No |
| 5 Year - Over 0% | `5yo0` | No |
| 5 Year - Over 5% | `5yo05` | No |
| 5 Year - Over 10% | `5yo10` | No |
| 5 Year - Over 25% | `5yo25` | No |
| 5 Year - Under 0% | `5yu0` | No |
| 5 Year - Under -5% | `5yu05` | No |
| 5 Year - Under -10% | `5yu10` | No |
| 5 Year - Under -25% | `5yu25` | No |
| More (Elite only) | (empty) | Yes |
| Custom (Elite only) | (empty) | Yes |

### `etf_sectortheme`

| Field | Value |
| --- | --- |
| Label | Sector/Theme |
| Control ID | fs_etf_sectortheme |
| Control type | select |
| Tabs | 5 |
| Disabled | Yes |
| Publicly queryable | No |
| Public options | 0 |
| Non-empty public options | 0 |
| Elite-only options | 1 |
| Template | `v=111&f=etf_sectortheme_selected_filter&ft=5` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Elite only | (empty) | Yes |

### `etf_sponsor`

| Field | Value |
| --- | --- |
| Label | Sponsor |
| Control ID | fs_etf_sponsor |
| Control type | select |
| Tabs | 4, 5 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 438 |
| Non-empty public options | 437 |
| Elite-only options | 1 |
| Template | `v=111&f=etf_sponsor_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| 21Shares | `21shares` | No |
| 3EDGE Asset Management | `3edgeassetmanagement` | No |
| 3Fourteen & SMI | `3fourteensmi` | No |
| Abacus FCF Advisors | `abacusfcfadvisors` | No |
| abrdn | `abrdn` | No |
| Absolute Investment Advisers | `absoluteinvestmentadvisers` | No |
| Academy AM | `academyam` | No |
| Accuvest Global Advisors | `accuvestglobaladvisors` | No |
| Acquirers Funds | `acquirersfunds` | No |
| Acruence Capital | `acruencecapital` | No |
| ACSI Funds | `acsifunds` | No |
| ACV ETF | `acvetf` | No |
| Adaptiv | `adaptiv` | No |
| ADAPTIVE INVESTMENTS | `adaptiveinvestments` | No |
| Adasina Social Capital | `adasinasocialcapital` | No |
| Advent | `advent` | No |
| Advisor Shares | `advisorshares` | No |
| Advisors Asset Management | `advisorsassetmanagement` | No |
| AGF | `agf` | No |
| Akre Capital Management | `akrecapitalmanagement` | No |
| Alexis Invests | `alexisinvests` | No |
| Alger | `alger` | No |
| AllianceBernstein | `alliancebernstein` | No |
| AllianzIM | `allianzim` | No |
| Allspring | `allspring` | No |
| Alpha Architect | `alphaarchitect` | No |
| Alpha Blue | `alphablue` | No |
| AlphaBit | `alphabit` | No |
| ALPS | `alps` | No |
| Altrius Capital | `altriuscapital` | No |
| AltShares | `altshares` | No |
| American Beacon | `americanbeacon` | No |
| American Century Investments | `americancenturyinvestments` | No |
| AMG Funds | `amgfunds` | No |
| Amplify Investments | `amplifyinvestments` | No |
| Amplius Asset Management | `ampliusassetmanagement` | No |
| Anfield Capital Management | `anfieldcapitalmanagement` | No |
| Angel Oak | `angeloak` | No |
| Anydrus Capital | `anydruscapital` | No |
| AOT INVEST | `aotinvest` | No |
| Applied Finance Funds | `appliedfinancefunds` | No |
| Aptus Capital Advisors | `aptuscapitaladvisors` | No |
| Archer Investment Corporation | `archerinvestmentcorporation` | No |
| Argent Capital Management | `argentcapitalmanagement` | No |
| Arin | `arin` | No |
| ARK Funds | `arkfunds` | No |
| Arlington Partners | `arlingtonpartners` | No |
| Armada ETF Advisors | `armadaetfadvisors` | No |
| ArrowShares | `arrowshares` | No |
| ARS Investment Partners | `arsinvestmentpartners` | No |
| Astoria | `astoria` | No |
| ATAC Funds | `atacfunds` | No |
| Atlas Capital | `atlascapital` | No |
| AXS Investments | `axsinvestments` | No |
| Aztlan | `aztlan` | No |
| Bahl & Gaynor | `bahlgaynor` | No |
| Ballast AM | `ballastam` | No |
| Bancreek | `bancreek` | No |
| Barclays | `barclays` | No |
| Barclays iPath | `barclaysipath` | No |
| Baron Capital | `baroncapital` | No |
| Bastion | `bastion` | No |
| Beacon | `beacon` | No |
| Beyond Investing | `beyondinvesting` | No |
| Bitwise | `bitwise` | No |
| Blackrock (iShares) | `blackrockishares` | No |
| Bluemonte Investment Management | `bluemonteinvestmentmanagement` | No |
| Blueprint Fund Management | `blueprintfundmanagement` | No |
| BNY Mellon | `bnymellon` | No |
| BondBloxx | `bondbloxx` | No |
| Brandes Investment | `brandesinvestment` | No |
| Brendan Wood | `brendanwood` | No |
| Bridges Capital | `bridgescapital` | No |
| Bridgeway | `bridgeway` | No |
| Brinsmere | `brinsmere` | No |
| Brookmont Capital | `brookmontcapital` | No |
| Brookstone | `brookstone` | No |
| Brown Advisory | `brownadvisory` | No |
| Brown Brothers Harriman | `brownbrothersharriman` | No |
| BufferLABS | `bufferlabs` | No |
| Build Asset Management | `buildassetmanagement` | No |
| Burney Investment | `burneyinvestment` | No |
| Bushido Capital | `bushidocapital` | No |
| Cabana ETF | `cabanaetf` | No |
| Calamos Investments | `calamosinvestments` | No |
| Cambiar Investors | `cambiarinvestors` | No |
| Cambria Funds | `cambriafunds` | No |
| Canary Capital Group | `canarycapitalgroup` | No |
| Cannell & Spears | `cannellspears` | No |
| Capital Group | `capitalgroup` | No |
| Carbon Collective | `carboncollective` | No |
| Castellan Group | `castellangroup` | No |
| CastleArk | `castleark` | No |
| CCM | `ccm` | No |
| City Different Investments | `citydifferentinvestments` | No |
| Clockwise Capital | `clockwisecapital` | No |
| Clough Capital Partners | `cloughcapitalpartners` | No |
| Coastal Equity Management | `coastalequitymanagement` | No |
| Cohen & Steers | `cohensteers` | No |
| CoinShares | `coinshares` | No |
| Columbia Threadneedle Investments | `columbiathreadneedleinvestments` | No |
| Concourse Capital | `concoursecapital` | No |
| Conductor ETF | `conductoretf` | No |
| Congress AMC | `congressamc` | No |
| Convergence Investment Partners | `convergenceinvestmentpartners` | No |
| Core Alternative Capital | `corealternativecapital` | No |
| Corgi Strategies | `corgistrategies` | No |
| CornerCap | `cornercap` | No |
| COtwo Advisors | `cotwoadvisors` | No |
| Counterpoint Funds | `counterpointfunds` | No |
| CrossingBridge | `crossingbridge` | No |
| Crossmark Global Investments | `crossmarkglobalinvestments` | No |
| Cullen | `cullen` | No |
| Cultivar Funds | `cultivarfunds` | No |
| CVA Funds | `cvafunds` | No |
| Dakota Wealth | `dakotawealth` | No |
| Dana Investment Advisors | `danainvestmentadvisors` | No |
| Davis Advisors | `davisadvisors` | No |
| Day Hagan | `dayhagan` | No |
| Days Global Advisors | `daysglobaladvisors` | No |
| Deepwater AM | `deepwateram` | No |
| Defiance ETFs | `defianceetfs` | No |
| Democracy Investments | `democracyinvestments` | No |
| Diamond Hill Capital Management | `diamondhillcapitalmanagement` | No |
| Dimensional | `dimensional` | No |
| Direxion Shares | `direxionshares` | No |
| Discipline Fund | `disciplinefund` | No |
| Distillate Capital | `distillatecapital` | No |
| Dividend Assets Capital | `dividendassetscapital` | No |
| Donoghue Forlines | `donoghueforlines` | No |
| DoubleLine Funds | `doublelinefunds` | No |
| Draco Evolution | `dracoevolution` | No |
| DWS | `dws` | No |
| Eagle Capital | `eaglecapital` | No |
| Elevate Shares | `elevateshares` | No |
| Elm Partners | `elmpartners` | No |
| EntrepreneurShares | `entrepreneurshares` | No |
| Envestnet | `envestnet` | No |
| ETF Managers Group | `etfmanagersgroup` | No |
| Euclid ETF | `euclidetf` | No |
| Even Herd | `evenherd` | No |
| Eventide ETFs | `eventideetfs` | No |
| Evoke Advisors | `evokeadvisors` | No |
| Exchange Traded Concepts | `exchangetradedconcepts` | No |
| F/m Investments | `fminvestments` | No |
| Fairlead Strategies | `fairleadstrategies` | No |
| Federated Hermes | `federatedhermes` | No |
| Fidelity | `fidelity` | No |
| First Eagle | `firsteagle` | No |
| First Manhattan | `firstmanhattan` | No |
| First Pacific Advisors | `firstpacificadvisors` | No |
| First Trust | `firsttrust` | No |
| FIS | `fis` | No |
| Flexshares (Northern Trust) | `flexsharesnortherntrust` | No |
| FolioBeyond | `foliobeyond` | No |
| Formidable Funds | `formidablefunds` | No |
| Fortuna Funds | `fortunafunds` | No |
| Founder ETFs | `founderetfs` | No |
| Franklin Templeton | `franklintempleton` | No |
| Freedom Day | `freedomday` | No |
| Frontier Asset Management | `frontierassetmanagement` | No |
| Fundsmith | `fundsmith` | No |
| Fundstrat Capital | `fundstratcapital` | No |
| FundX | `fundx` | No |
| Future Funds | `futurefunds` | No |
| Gabelli | `gabelli` | No |
| Gadsden | `gadsden` | No |
| GAMCO Investors | `gamcoinvestors` | No |
| GammaRoad | `gammaroad` | No |
| Genter Capital Management | `gentercapitalmanagement` | No |
| GGM Wealth Advisors | `ggmwealthadvisors` | No |
| Global X | `globalx` | No |
| GMO | `gmo` | No |
| God Bless | `godbless` | No |
| Golden Eagle Strategies | `goldeneaglestrategies` | No |
| Goldman Sachs | `goldmansachs` | No |
| Goose Hollow | `goosehollow` | No |
| Gotham ETF | `gothametf` | No |
| GQG Partners | `gqgpartners` | No |
| GraniteShares | `graniteshares` | No |
| Grayscale | `grayscale` | No |
| Grizzle | `grizzle` | No |
| Guinness Atkinson | `guinnessatkinson` | No |
| Guru Focus | `gurufocus` | No |
| Harbor Funds | `harborfunds` | No |
| Harmonic Capital | `harmoniccapital` | No |
| Hartford Funds | `hartfordfunds` | No |
| Hashdex | `hashdex` | No |
| Hedgeye Asset Management | `hedgeyeassetmanagement` | No |
| Hennessy Funds | `hennessyfunds` | No |
| Hilton | `hilton` | No |
| Honeytree | `honeytree` | No |
| Horizon Investments | `horizoninvestments` | No |
| Horizon Kinetics | `horizonkinetics` | No |
| Hotchkis & Wiley | `hotchkiswiley` | No |
| Howard Capital Management | `howardcapitalmanagement` | No |
| Hoya Capital | `hoyacapital` | No |
| Hypatia Capital | `hypatiacapital` | No |
| IDX Shares | `idxshares` | No |
| iMGP Global Partner | `imgpglobalpartner` | No |
| Impact Shares | `impactshares` | No |
| Indexperts | `indexperts` | No |
| Infrastructure Capital Advisors | `infrastructurecapitaladvisors` | No |
| Innovator Management | `innovatormanagement` | No |
| Inspire Investing | `inspireinvesting` | No |
| Intech IM | `intechim` | No |
| Intelligent Alpha | `intelligentalpha` | No |
| Invesco | `invesco` | No |
| iREIT | `ireit` | No |
| Janus | `janus` | No |
| Jensen | `jensen` | No |
| JLens | `jlens` | No |
| John Hancock Funds | `johnhancockfunds` | No |
| JPMorgan Chase | `jpmorganchase` | No |
| Keating Investment | `keatinginvestment` | No |
| Kensington Asset Management | `kensingtonassetmanagement` | No |
| Kingsbarn Capital | `kingsbarncapital` | No |
| KKM Financial | `kkmfinancial` | No |
| Kovitz | `kovitz` | No |
| Krane Shares | `kraneshares` | No |
| Kurv Shares | `kurvshares` | No |
| Laffer Tengler | `laffertengler` | No |
| Langar Investment | `langarinvestment` | No |
| Lazard Asset Management | `lazardassetmanagement` | No |
| LeaderShares | `leadershares` | No |
| Leatherback Asset Management | `leatherbackassetmanagement` | No |
| Leuthold Group | `leutholdgroup` | No |
| Leverage Shares | `leverageshares` | No |
| Liberty One IM | `libertyoneim` | No |
| LionShares | `lionshares` | No |
| Liquid Strategies | `liquidstrategies` | No |
| Little Harbor Advisors | `littleharboradvisors` | No |
| Logan Capital | `logancapital` | No |
| Logiq Capital | `logiqcapital` | No |
| Long Pond Capital | `longpondcapital` | No |
| Longview | `longview` | No |
| LSV Asset Management | `lsvassetmanagement` | No |
| Madison Funds | `madisonfunds` | No |
| Main Management | `mainmanagement` | No |
| Mairs & Power | `mairspower` | No |
| Man Group | `mangroup` | No |
| Manzil | `manzil` | No |
| MarketDesk | `marketdesk` | No |
| Mason Capital | `masoncapital` | No |
| Matrix Asset Advisors | `matrixassetadvisors` | No |
| Matthews Asia | `matthewsasia` | No |
| MAX ETNs | `maxetns` | No |
| McElhenny Sheffield | `mcelhennysheffield` | No |
| Measured Risk Portfolios | `measuredriskportfolios` | No |
| Merk Investments | `merkinvestments` | No |
| MFS | `mfs` | No |
| MicroSectors | `microsectors` | No |
| Militia Investments | `militiainvestments` | No |
| Miller Value Partners | `millervaluepartners` | No |
| Mitsubishi | `mitsubishi` | No |
| MKAM ETF | `mkametf` | No |
| MOHR Funds | `mohrfunds` | No |
| Monarch Funds | `monarchfunds` | No |
| Morgan Dempsey | `morgandempsey` | No |
| Morgan Stanley | `morganstanley` | No |
| Motley Fool Asset Management | `motleyfoolassetmanagement` | No |
| MRBL | `mrbl` | No |
| MUSQ | `musq` | No |
| Myriad Asset Management Advisors | `myriadassetmanagementadvisors` | No |
| National Security Index | `nationalsecurityindex` | No |
| Natixis | `natixis` | No |
| Ned Davis Research | `neddavisresearch` | No |
| Nelson Capital | `nelsoncapital` | No |
| NEOS Funds | `neosfunds` | No |
| NestYield | `nestyield` | No |
| Neuberger Berman | `neubergerberman` | No |
| New York Life Investments | `newyorklifeinvestments` | No |
| NextGen ETF | `nextgenetf` | No |
| Nightview Capital | `nightviewcapital` | No |
| Nomura Group | `nomuragroup` | No |
| North Square Investments | `northsquareinvestments` | No |
| Nuveen | `nuveen` | No |
| Oakmark | `oakmark` | No |
| Obra | `obra` | No |
| Ocean Park | `oceanpark` | No |
| OneAscent Investments | `oneascentinvestments` | No |
| ONEFUND | `onefund` | No |
| Opal Capital | `opalcapital` | No |
| Optimize Financial | `optimizefinancial` | No |
| OT Advisors | `otadvisors` | No |
| OTG Asset Management | `otgassetmanagement` | No |
| Pacer Financial | `pacerfinancial` | No |
| Pacific Asset Management | `pacificassetmanagement` | No |
| Palmer Square | `palmersquare` | No |
| Panagram | `panagram` | No |
| Paralel Advisors | `paraleladvisors` | No |
| Parnassus | `parnassus` | No |
| PeakShares | `peakshares` | No |
| Peerless | `peerless` | No |
| Peo Partners | `peopartners` | No |
| PGIM Investments | `pgiminvestments` | No |
| Pictet Asset Management | `pictetassetmanagement` | No |
| PIMCO | `pimco` | No |
| Pinnacle Dynamic Funds | `pinnacledynamicfunds` | No |
| PL Funds | `plfunds` | No |
| PlanRock | `planrock` | No |
| PMV Capital | `pmvcapital` | No |
| Point Bridge Capital | `pointbridgecapital` | No |
| Polen Capital Credit | `polencapitalcredit` | No |
| Portfolio Building Block | `portfoliobuildingblock` | No |
| Praxis Investment Management | `praxisinvestmentmanagement` | No |
| Precidian | `precidian` | No |
| Principal Financial Services | `principalfinancialservices` | No |
| ProcureAM | `procuream` | No |
| ProShares | `proshares` | No |
| Prospera Funds | `prosperafunds` | No |
| PT Asset Management | `ptassetmanagement` | No |
| Q3 All-Season | `q3allseason` | No |
| Qraft Technologies | `qrafttechnologies` | No |
| Quantify | `quantify` | No |
| Rainwater Equity | `rainwaterequity` | No |
| Range ETFs | `rangeetfs` | No |
| Rareview Funds | `rareviewfunds` | No |
| Rayliant | `rayliant` | No |
| Raymond James Investment Management | `raymondjamesinvestmentmanagement` | No |
| Reckoner | `reckoner` | No |
| Reflection Asset Management | `reflectionassetmanagement` | No |
| Regan Capital | `regancapital` | No |
| Regents Park Funds | `regentsparkfunds` | No |
| Relative Sentiment | `relativesentiment` | No |
| Renaissance | `renaissance` | No |
| Research Affiliates | `researchaffiliates` | No |
| Return Stacked | `returnstacked` | No |
| Reverb | `reverb` | No |
| REX Shares | `rexshares` | No |
| River1 | `river1` | No |
| RockCreek | `rockcreek` | No |
| Rockefeller Asset Management | `rockefellerassetmanagement` | No |
| Roundhill Financial | `roundhillfinancial` | No |
| Running Oak | `runningoak` | No |
| Russell | `russell` | No |
| Saba Capital | `sabacapital` | No |
| SanJac Alpha | `sanjacalpha` | No |
| Sarmaya Partners | `sarmayapartners` | No |
| Scharf Investments | `scharfinvestments` | No |
| Schwab | `schwab` | No |
| Segall Bryant & Hamill | `segallbryanthamill` | No |
| SEI Investments Company | `seiinvestmentscompany` | No |
| Select Funds | `selectfunds` | No |
| Sequoia Financial Group | `sequoiafinancialgroup` | No |
| Shelton Capital Management | `sheltoncapitalmanagement` | No |
| Simplify ETF | `simplifyetf` | No |
| Siren ETF | `sirenetf` | No |
| SMART Wealth | `smartwealth` | No |
| Sofi | `sofi` | No |
| SonicShares | `sonicshares` | No |
| Sound ETF | `soundetf` | No |
| Soundwatch | `soundwatch` | No |
| Sovereign's Capital | `sovereignscapital` | No |
| Sparkline Capital | `sparklinecapital` | No |
| Spear Invest | `spearinvest` | No |
| SPFunds | `spfunds` | No |
| Spinnaker ETF Trust | `spinnakeretftrust` | No |
| Split Rock | `splitrock` | No |
| Sprott Asset Management | `sprottassetmanagement` | No |
| Stance Capital | `stancecapital` | No |
| State Street (SPDR) | `statestreetspdr` | No |
| Sterling Capital | `sterlingcapital` | No |
| STF Management | `stfmanagement` | No |
| StockSnips | `stocksnips` | No |
| Stone Ridge | `stoneridge` | No |
| Stoneport Advisors | `stoneportadvisors` | No |
| Strategas Asset Management | `strategasassetmanagement` | No |
| Strategy Shares | `strategyshares` | No |
| Stratified Funds | `stratifiedfunds` | No |
| Strive Asset Management | `striveassetmanagement` | No |
| Subversive ETFs | `subversiveetfs` | No |
| Summit Global Investments | `summitglobalinvestments` | No |
| Suncoast Equity Management | `suncoastequitymanagement` | No |
| SWAN Global Investments | `swanglobalinvestments` | No |
| SWP Investment Management | `swpinvestmentmanagement` | No |
| Symmetry Partners | `symmetrypartners` | No |
| T. Rowe Price | `troweprice` | No |
| Tactical Advantage | `tacticaladvantage` | No |
| TappAlpha | `tappalpha` | No |
| TCW Group | `tcwgroup` | No |
| Tema | `tema` | No |
| Teramo Advisors | `teramoadvisors` | No |
| Teucrium | `teucrium` | No |
| Texas Capital | `texascapital` | No |
| The Bahnsen Group (TBG) | `thebahnsengrouptbg` | No |
| Themes ETFs | `themesetfs` | No |
| THOR Financial Technologies | `thorfinancialtechnologies` | No |
| Thornburg | `thornburg` | No |
| Thrivent | `thrivent` | No |
| Tidal | `tidal` | No |
| TimesSquare Capital Management | `timessquarecapitalmanagement` | No |
| Timothy Plan | `timothyplan` | No |
| Toews Funds | `toewsfunds` | No |
| Tortoise Capital Advisors | `tortoisecapitaladvisors` | No |
| Touchstone Investments | `touchstoneinvestments` | No |
| Towle & Co | `towleco` | No |
| TradersAI | `tradersai` | No |
| Transamerica | `transamerica` | No |
| Tremblant | `tremblant` | No |
| TrueShares | `trueshares` | No |
| Truth Social Funds | `truthsocialfunds` | No |
| Tuttle Tactical Management | `tuttletacticalmanagement` | No |
| Tweedy, Browne | `tweedybrowne` | No |
| Twin Oak | `twinoak` | No |
| U.S. Global Investors | `usglobalinvestors` | No |
| UBS | `ubs` | No |
| United States Commodity Funds | `unitedstatescommodityfunds` | No |
| Unlimited | `unlimited` | No |
| Van Eck Associates Corporation | `vaneckassociatescorporation` | No |
| Vanguard | `vanguard` | No |
| Vert Asset Management | `vertassetmanagement` | No |
| Vest Financial | `vestfinancial` | No |
| VictoryShares | `victoryshares` | No |
| Vident | `vident` | No |
| Virtus ETF Solutions | `virtusetfsolutions` | No |
| VistaShares | `vistashares` | No |
| Volatility Shares | `volatilityshares` | No |
| Vontobel AM | `vontobelam` | No |
| Voya Investment Management | `voyainvestmentmanagement` | No |
| Wahed Invest | `wahedinvest` | No |
| Warren Capital Group | `warrencapitalgroup` | No |
| Warren Street Wealth Advisors | `warrenstreetwealthadvisors` | No |
| Wayfinder | `wayfinder` | No |
| WBI Shares | `wbishares` | No |
| Wealth Trust | `wealthtrust` | No |
| WEBs Investments | `websinvestments` | No |
| Wedbush Funds | `wedbushfunds` | No |
| Weitz Investment Management | `weitzinvestmentmanagement` | No |
| Westwood | `westwood` | No |
| WHITEWOLF | `whitewolf` | No |
| Wisdom Fixed Income Management | `wisdomfixedincomemanagement` | No |
| Wisdom Tree | `wisdomtree` | No |
| X-Square ETF | `xsquareetf` | No |
| Xfunds | `xfunds` | No |
| Zacks | `zacks` | No |
| Zega ETF | `zegaetf` | No |
| Custom (Elite only) | (empty) | Yes |

### `etf_structuretype`

| Field | Value |
| --- | --- |
| Label | Structure Type |
| Control ID | fs_etf_structuretype |
| Control type | select |
| Tabs | 5 |
| Disabled | Yes |
| Publicly queryable | No |
| Public options | 0 |
| Non-empty public options | 0 |
| Elite-only options | 1 |
| Template | `v=111&f=etf_structuretype_selected_filter&ft=5` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Elite only | (empty) | Yes |

### `etf_tags`

| Field | Value |
| --- | --- |
| Label | Tags |
| Control ID | fs_etf_tags |
| Control type | select |
| Tabs | 4, 5 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 538 |
| Non-empty public options | 537 |
| Elite-only options | 1 |
| Template | `v=111&f=etf_tags_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| 13F | `13f` | No |
| 3d-printing | `3dprinting` | No |
| 5G | `5g` | No |
| A.I. | `ai` | No |
| AAL | `aal` | No |
| AAPL | `aapl` | No |
| ABNB | `abnb` | No |
| ABS | `abs` | No |
| ACHR | `achr` | No |
| ADBE | `adbe` | No |
| aerospace-defense | `aerospacedefense` | No |
| Africa | `africa` | No |
| AFRM | `afrm` | No |
| aggressive | `aggressive` | No |
| agriculture | `agriculture` | No |
| aircraft | `aircraft` | No |
| airlines | `airlines` | No |
| ALAB | `alab` | No |
| alcohol-tobacco | `alcoholtobacco` | No |
| AMD | `amd` | No |
| AMZN | `amzn` | No |
| ANET | `anet` | No |
| APLD | `apld` | No |
| APP | `app` | No |
| Argentina | `argentina` | No |
| ARKK | `arkk` | No |
| ARM | `arm` | No |
| Asia | `asia` | No |
| Asia-ex-Japan | `asiaexjapan` | No |
| Asia-Pacific | `asiapacific` | No |
| Asia-Pacific-ex-Japan | `asiapacificexjapan` | No |
| ASML | `asml` | No |
| asset-rotation | `assetrotation` | No |
| ASTS | `asts` | No |
| AUD | `aud` | No |
| AUR | `aur` | No |
| Australia | `australia` | No |
| Austria | `austria` | No |
| auto-industry | `autoindustry` | No |
| autocallable | `autocallable` | No |
| automation | `automation` | No |
| autonomous-vehicles | `autonomousvehicles` | No |
| AVAV | `avav` | No |
| AVGO | `avgo` | No |
| AXON | `axon` | No |
| AZN | `azn` | No |
| BA | `ba` | No |
| BABA | `baba` | No |
| banks | `banks` | No |
| batteries | `batteries` | No |
| BBAI | `bbai` | No |
| BDC | `bdc` | No |
| BE | `be` | No |
| Belgium | `belgium` | No |
| betting | `betting` | No |
| BIDU | `bidu` | No |
| big-data | `bigdata` | No |
| biotechnology | `biotechnology` | No |
| bitcoin | `bitcoin` | No |
| BKNG | `bkng` | No |
| blockchain | `blockchain` | No |
| BLSH | `blsh` | No |
| blue-chip | `bluechip` | No |
| BMNR | `bmnr` | No |
| bonds | `bonds` | No |
| BP | `bp` | No |
| Brazil | `brazil` | No |
| BRKB | `brkb` | No |
| brokerage | `brokerage` | No |
| BU | `bu` | No |
| buffer | `buffer` | No |
| BULL | `bull` | No |
| buyback | `buyback` | No |
| CAD | `cad` | No |
| Canada | `canada` | No |
| cannabis | `cannabis` | No |
| capital-markets | `capitalmarkets` | No |
| carbon-allowances | `carbonallowances` | No |
| carbon-low | `carbonlow` | No |
| cash-cow | `cashcow` | No |
| casino | `casino` | No |
| catholic-values | `catholicvalues` | No |
| CEG | `ceg` | No |
| CELH | `celh` | No |
| CHF | `chf` | No |
| Chile | `chile` | No |
| China | `china` | No |
| CIFR | `cifr` | No |
| clean-energy | `cleanenergy` | No |
| climate-change | `climatechange` | No |
| clinical-trials | `clinicaltrials` | No |
| CLO | `clo` | No |
| cloud-computing | `cloudcomputing` | No |
| CLS | `cls` | No |
| CLSK | `clsk` | No |
| CMG | `cmg` | No |
| coal | `coal` | No |
| cobalt | `cobalt` | No |
| COIN | `coin` | No |
| Colombia | `colombia` | No |
| commodity | `commodity` | No |
| communication-services | `communicationservices` | No |
| community-banks | `communitybanks` | No |
| conservative | `conservative` | No |
| consumer | `consumer` | No |
| consumer-discretionary | `consumerdiscretionary` | No |
| consumer-staples | `consumerstaples` | No |
| convertible-securities | `convertiblesecurities` | No |
| copper | `copper` | No |
| corn | `corn` | No |
| corporate-bonds | `corporatebonds` | No |
| CORZ | `corz` | No |
| COST | `cost` | No |
| covered-call | `coveredcall` | No |
| CRCL | `crcl` | No |
| CRDO | `crdo` | No |
| CRM | `crm` | No |
| CRWD | `crwd` | No |
| CRWV | `crwv` | No |
| crypto | `crypto` | No |
| crypto-spot | `cryptospot` | No |
| CSCO | `csco` | No |
| currencies | `currencies` | No |
| currency | `currency` | No |
| currency-bonds | `currencybonds` | No |
| customer | `customer` | No |
| CVNA | `cvna` | No |
| cyber-security | `cybersecurity` | No |
| DASH | `dash` | No |
| data-centers | `datacenters` | No |
| DAX | `dax` | No |
| DDOG | `ddog` | No |
| debt | `debt` | No |
| debt-securities | `debtsecurities` | No |
| DELL | `dell` | No |
| democrats | `democrats` | No |
| Denmark | `denmark` | No |
| derivatives | `derivatives` | No |
| Developed | `developed` | No |
| Developed-ex-Japan | `developedexjapan` | No |
| Developed-ex-U.S. | `developedexus` | No |
| digital-infrastructure | `digitalinfrastructure` | No |
| digital-payments | `digitalpayments` | No |
| DIS | `dis` | No |
| disruptive | `disruptive` | No |
| dividend | `dividend` | No |
| dividend-growth | `dividendgrowth` | No |
| dividend-weight | `dividendweight` | No |
| DJIA | `djia` | No |
| DJT | `djt` | No |
| DKNG | `dkng` | No |
| dodge | `dodge` | No |
| doge | `doge` | No |
| drones | `drones` | No |
| dry-bulk | `drybulk` | No |
| DUOL | `duol` | No |
| e-commerce | `ecommerce` | No |
| e-sports | `esports` | No |
| EAFE | `eafe` | No |
| electric-vehicles | `electricvehicles` | No |
| electricity | `electricity` | No |
| Emerging | `emerging` | No |
| Emerging-ex-China | `emergingexchina` | No |
| energy | `energy` | No |
| energy-management | `energymanagement` | No |
| energy-storage | `energystorage` | No |
| ENPH | `enph` | No |
| entertainment | `entertainment` | No |
| environmental | `environmental` | No |
| equal-weight | `equalweight` | No |
| equity | `equity` | No |
| ESG | `esg` | No |
| ETFs | `etfs` | No |
| ethereum | `ethereum` | No |
| ETOR | `etor` | No |
| EUR | `eur` | No |
| Europe | `europe` | No |
| Eurozone | `eurozone` | No |
| ex-energy | `exenergy` | No |
| ex-financial | `exfinancial` | No |
| ex-fossil-fuels | `exfossilfuels` | No |
| ex-healthcare | `exhealthcare` | No |
| ex-technology | `extechnology` | No |
| exchanges | `exchanges` | No |
| F | `f` | No |
| factor-rotation | `factorrotation` | No |
| FANG | `fang` | No |
| FIG | `fig` | No |
| financial | `financial` | No |
| Finland | `finland` | No |
| fintech | `fintech` | No |
| fixed-income | `fixedincome` | No |
| fixed-period | `fixedperiod` | No |
| floating-rate | `floatingrate` | No |
| FLY | `fly` | No |
| food | `food` | No |
| food-beverage | `foodbeverage` | No |
| fossil-fuels | `fossilfuels` | No |
| France | `france` | No |
| fundamental | `fundamental` | No |
| fundamental-weight | `fundamentalweight` | No |
| FUTU | `futu` | No |
| futures | `futures` | No |
| gaming | `gaming` | No |
| GBP | `gbp` | No |
| GEMI | `gemi` | No |
| gender | `gender` | No |
| genomics | `genomics` | No |
| Germany | `germany` | No |
| GEV | `gev` | No |
| GEVG | `gevg` | No |
| GLD | `gld` | No |
| Global | `global` | No |
| Global-ex-U.S. | `globalexus` | No |
| Global-ex-China | `globalexchina` | No |
| GLXY | `glxy` | No |
| GME | `gme` | No |
| gold | `gold` | No |
| gold-miners | `goldminers` | No |
| GOOGL | `googl` | No |
| government-bonds | `governmentbonds` | No |
| GRAB | `grab` | No |
| Greece | `greece` | No |
| growth | `growth` | No |
| GS | `gs` | No |
| GSK | `gsk` | No |
| hardware | `hardware` | No |
| healthcare | `healthcare` | No |
| hedera | `hedera` | No |
| hedge-currency | `hedgecurrency` | No |
| hedge-fund | `hedgefund` | No |
| hedge-inflation | `hedgeinflation` | No |
| hedge-rates | `hedgerates` | No |
| hedge-risk | `hedgerisk` | No |
| high-beta | `highbeta` | No |
| high-yield | `highyield` | No |
| HIMS | `hims` | No |
| home-construction | `homeconstruction` | No |
| Honk-Kong | `honkkong` | No |
| HOOD | `hood` | No |
| hotel | `hotel` | No |
| HSBC | `hsbc` | No |
| hydrogen | `hydrogen` | No |
| I.T. | `it` | No |
| IBIT | `ibit` | No |
| Iceland | `iceland` | No |
| income | `income` | No |
| India | `india` | No |
| Indonesia | `indonesia` | No |
| industrials | `industrials` | No |
| inflation | `inflation` | No |
| infrastructure | `infrastructure` | No |
| innovation | `innovation` | No |
| insurance | `insurance` | No |
| INTC | `intc` | No |
| International | `international` | No |
| internet | `internet` | No |
| internet-of-things | `internetofthings` | No |
| inverse | `inverse` | No |
| investment-grade | `investmentgrade` | No |
| IONQ | `ionq` | No |
| IPO | `ipo` | No |
| Ireland | `ireland` | No |
| IREN | `iren` | No |
| Israel | `israel` | No |
| ISRG | `isrg` | No |
| Italy | `italy` | No |
| Japan | `japan` | No |
| JD | `jd` | No |
| JOBY | `joby` | No |
| JPM | `jpm` | No |
| JPY | `jpy` | No |
| KTOS | `ktos` | No |
| Kuwait | `kuwait` | No |
| LAC | `lac` | No |
| large-cap | `largecap` | No |
| Latin-America | `latinamerica` | No |
| LCID | `lcid` | No |
| leadership | `leadership` | No |
| leverage | `leverage` | No |
| LINK | `link` | No |
| litecoin | `litecoin` | No |
| lithium | `lithium` | No |
| LLY | `lly` | No |
| LMND | `lmnd` | No |
| LMT | `lmt` | No |
| loans | `loans` | No |
| long-short | `longshort` | No |
| LRCX | `lrcx` | No |
| LULU | `lulu` | No |
| luxury | `luxury` | No |
| LYFT | `lyft` | No |
| M&A | `ma` | No |
| machine-learning | `machinelearning` | No |
| macro | `macro` | No |
| Malaysia | `malaysia` | No |
| MARA | `mara` | No |
| market-sentiment | `marketsentiment` | No |
| materials | `materials` | No |
| MBS | `mbs` | No |
| MDB | `mdb` | No |
| media | `media` | No |
| medical | `medical` | No |
| mega-cap | `megacap` | No |
| MELI | `meli` | No |
| META | `meta` | No |
| metals | `metals` | No |
| metaverse | `metaverse` | No |
| Mexico | `mexico` | No |
| micro-cap | `microcap` | No |
| mid-cap | `midcap` | No |
| mid-large-cap | `midlargecap` | No |
| midstream | `midstream` | No |
| military | `military` | No |
| millennial | `millennial` | No |
| miners | `miners` | No |
| MLP | `mlp` | No |
| moderate | `moderate` | No |
| momentum | `momentum` | No |
| monopolies | `monopolies` | No |
| MP | `mp` | No |
| MRVL | `mrvl` | No |
| MSFT | `msft` | No |
| MSTR | `mstr` | No |
| MU | `mu` | No |
| multi-asset | `multiasset` | No |
| multi-factor | `multifactor` | No |
| multi-sector | `multisector` | No |
| municipal-bonds | `municipalbonds` | No |
| music | `music` | No |
| Nasdaq-composite | `nasdaqcomposite` | No |
| Nasdaq100 | `nasdaq100` | No |
| natural-gas | `naturalgas` | No |
| natural-resources | `naturalresources` | No |
| NBIS | `nbis` | No |
| NEM | `nem` | No |
| NET | `net` | No |
| Netherlands | `netherlands` | No |
| network | `network` | No |
| New-Zealand | `newzealand` | No |
| next-gen | `nextgen` | No |
| NFLX | `nflx` | No |
| nickel | `nickel` | No |
| Nikkei-400 | `nikkei400` | No |
| NNE | `nne` | No |
| non-ESG | `nonesg` | No |
| North-America | `northamerica` | No |
| Norway | `norway` | No |
| NOW | `now` | No |
| NU | `nu` | No |
| nuclear-energy | `nuclearenergy` | No |
| NVDA | `nvda` | No |
| NVO | `nvo` | No |
| NVTS | `nvts` | No |
| oil | `oil` | No |
| oil-gas-exp-prod | `oilgasexpprod` | No |
| oil-gas-services | `oilgasservices` | No |
| OKLO | `oklo` | No |
| OKTA | `okta` | No |
| online-stores | `onlinestores` | No |
| OPEN | `open` | No |
| options | `options` | No |
| ORCL | `orcl` | No |
| OSCR | `oscr` | No |
| palladium | `palladium` | No |
| PANW | `panw` | No |
| patents | `patents` | No |
| PDD | `pdd` | No |
| Peru | `peru` | No |
| pet-care | `petcare` | No |
| pharmaceutical | `pharmaceutical` | No |
| philippines | `philippines` | No |
| physical | `physical` | No |
| pipelines | `pipelines` | No |
| platinum | `platinum` | No |
| PLTR | `pltr` | No |
| PM | `pm` | No |
| Poland | `poland` | No |
| politics | `politics` | No |
| PONY | `pony` | No |
| precious-metals | `preciousmetals` | No |
| preferred | `preferred` | No |
| preferred-securities | `preferredsecurities` | No |
| private-credit | `privatecredit` | No |
| private-equity | `privateequity` | No |
| put-write | `putwrite` | No |
| PYPL | `pypl` | No |
| QBTS | `qbts` | No |
| QCOM | `qcom` | No |
| QQQ | `qqq` | No |
| QS | `qs` | No |
| QSX | `qsx` | No |
| quality | `quality` | No |
| quantitative | `quantitative` | No |
| quantum-computing | `quantumcomputing` | No |
| Quatar | `quatar` | No |
| QUBT | `qubt` | No |
| R&D | `rd` | No |
| rare-earth | `rareearth` | No |
| RBLX | `rblx` | No |
| RDDT | `rddt` | No |
| real-assets | `realassets` | No |
| real-estate | `realestate` | No |
| regional-banks | `regionalbanks` | No |
| REITs | `reits` | No |
| relative-strength | `relativestrength` | No |
| renewable-energy | `renewableenergy` | No |
| republicans | `republicans` | No |
| responsible | `responsible` | No |
| restaurant | `restaurant` | No |
| retail | `retail` | No |
| retail-stores | `retailstores` | No |
| revenue | `revenue` | No |
| RGTI | `rgti` | No |
| RIOT | `riot` | No |
| ripple | `ripple` | No |
| rising-rates | `risingrates` | No |
| RIVN | `rivn` | No |
| RKLB | `rklb` | No |
| robotics | `robotics` | No |
| RTX | `rtx` | No |
| Russell-1000 | `russell1000` | No |
| Russell-200 | `russell200` | No |
| Russell-2000 | `russell2000` | No |
| Russell-2500 | `russell2500` | No |
| Russell-3000 | `russell3000` | No |
| SAP | `sap` | No |
| SATS | `sats` | No |
| Saudi-Arabia | `saudiarabia` | No |
| SBET | `sbet` | No |
| SBUX | `sbux` | No |
| sector-rotation | `sectorrotation` | No |
| semiconductors | `semiconductors` | No |
| senior-loans | `seniorloans` | No |
| sharia-compliant | `shariacompliant` | No |
| SHEL | `shel` | No |
| shipping | `shipping` | No |
| SHOP | `shop` | No |
| short | `short` | No |
| silver | `silver` | No |
| silver-miners | `silverminers` | No |
| Singapore | `singapore` | No |
| single-asset | `singleasset` | No |
| SLV | `slv` | No |
| small-cap | `smallcap` | No |
| small-mid-cap | `smallmidcap` | No |
| smart-grid | `smartgrid` | No |
| smart-mobility | `smartmobility` | No |
| SMCI | `smci` | No |
| SMR | `smr` | No |
| SNOW | `snow` | No |
| SNPX | `snpx` | No |
| social | `social` | No |
| social-media | `socialmedia` | No |
| SOFI | `sofi` | No |
| software | `software` | No |
| solana | `solana` | No |
| solar | `solar` | No |
| SOUN | `soun` | No |
| South-Africa | `southafrica` | No |
| South-Korea | `southkorea` | No |
| soybean | `soybean` | No |
| SP100 | `sp100` | No |
| SP1000 | `sp1000` | No |
| SP1500 | `sp1500` | No |
| SP400 | `sp400` | No |
| SP500 | `sp500` | No |
| SP600 | `sp600` | No |
| SPAC | `spac` | No |
| space-exploration | `spaceexploration` | No |
| Spain | `spain` | No |
| spin-off | `spinoff` | No |
| SPOT | `spot` | No |
| SPY | `spy` | No |
| SRPT | `srpt` | No |
| steel | `steel` | No |
| STHH | `sthh` | No |
| sugar | `sugar` | No |
| sui | `sui` | No |
| sukuk | `sukuk` | No |
| sustainability | `sustainability` | No |
| Sweden | `sweden` | No |
| Switzerland | `switzerland` | No |
| tactical | `tactical` | No |
| Taiwan | `taiwan` | No |
| target-drawdown | `targetdrawdown` | No |
| technology | `technology` | No |
| TEM | `tem` | No |
| TER | `ter` | No |
| Thailand | `thailand` | No |
| timber | `timber` | No |
| TIPS | `tips` | No |
| TM | `tm` | No |
| transportation | `transportation` | No |
| travel | `travel` | No |
| treasuries | `treasuries` | No |
| TSLA | `tsla` | No |
| TSM | `tsm` | No |
| TTD | `ttd` | No |
| Turkey | `turkey` | No |
| U | `u` | No |
| U.K. | `uk` | No |
| U.S. | `us` | No |
| UAE | `uae` | No |
| UBER | `uber` | No |
| UNH | `unh` | No |
| UNHW | `unhw` | No |
| UPS | `ups` | No |
| upside-cap | `upsidecap` | No |
| UPST | `upst` | No |
| upstream | `upstream` | No |
| UPXI | `upxi` | No |
| uranium | `uranium` | No |
| uranium-miners | `uraniumminers` | No |
| USD | `usd` | No |
| USO | `uso` | No |
| utilities | `utilities` | No |
| value | `value` | No |
| variable-rate | `variablerate` | No |
| vegan | `vegan` | No |
| Vietnam | `vietnam` | No |
| vix | `vix` | No |
| volatility | `volatility` | No |
| volatility-index | `volatilityindex` | No |
| volatility-weight | `volatilityweight` | No |
| VOYG | `voyg` | No |
| VRT | `vrt` | No |
| VST | `vst` | No |
| water | `water` | No |
| wheat | `wheat` | No |
| wind | `wind` | No |
| WMT | `wmt` | No |
| wood | `wood` | No |
| WULF | `wulf` | No |
| XOM | `xom` | No |
| XYZ | `xyz` | No |
| zero-coupon | `zerocoupon` | No |
| Custom (Elite only) | (empty) | Yes |

### `exch`

| Field | Value |
| --- | --- |
| Label | Exchange |
| Control ID | fs_exch |
| Control type | select |
| Tabs | 4, 1 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 5 |
| Non-empty public options | 4 |
| Elite-only options | 1 |
| Template | `v=111&f=exch_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| AMEX | `amex` | No |
| CBOE | `cboe` | No |
| NASDAQ | `nasd` | No |
| NYSE | `nyse` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_curratio`

| Field | Value |
| --- | --- |
| Label | Current Ratio |
| Control ID | fs_fa_curratio |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 13 |
| Non-empty public options | 12 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_curratio_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| High (>3) | `high` | No |
| Low (<1) | `low` | No |
| Under 1 | `u1` | No |
| Under 0.5 | `u0.5` | No |
| Over 0.5 | `o0.5` | No |
| Over 1 | `o1` | No |
| Over 1.5 | `o1.5` | No |
| Over 2 | `o2` | No |
| Over 3 | `o3` | No |
| Over 4 | `o4` | No |
| Over 5 | `o5` | No |
| Over 10 | `o10` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_debteq`

| Field | Value |
| --- | --- |
| Label | Debt/Equity |
| Control ID | fs_fa_debteq |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 23 |
| Non-empty public options | 22 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_debteq_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| High (>0.5) | `high` | No |
| Low (<0.1) | `low` | No |
| Under 1 | `u1` | No |
| Under 0.9 | `u0.9` | No |
| Under 0.8 | `u0.8` | No |
| Under 0.7 | `u0.7` | No |
| Under 0.6 | `u0.6` | No |
| Under 0.5 | `u0.5` | No |
| Under 0.4 | `u0.4` | No |
| Under 0.3 | `u0.3` | No |
| Under 0.2 | `u0.2` | No |
| Under 0.1 | `u0.1` | No |
| Over 0.1 | `o0.1` | No |
| Over 0.2 | `o0.2` | No |
| Over 0.3 | `o0.3` | No |
| Over 0.4 | `o0.4` | No |
| Over 0.5 | `o0.5` | No |
| Over 0.6 | `o0.6` | No |
| Over 0.7 | `o0.7` | No |
| Over 0.8 | `o0.8` | No |
| Over 0.9 | `o0.9` | No |
| Over 1 | `o1` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_div`

| Field | Value |
| --- | --- |
| Label | Dividend Yield |
| Control ID | fs_fa_div |
| Control type | select |
| Tabs | 4, 1 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 15 |
| Non-empty public options | 14 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_div_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| None (0%) | `none` | No |
| Positive (>0%) | `pos` | No |
| High (>5%) | `high` | No |
| Very High (>10%) | `veryhigh` | No |
| Over 1% | `o1` | No |
| Over 2% | `o2` | No |
| Over 3% | `o3` | No |
| Over 4% | `o4` | No |
| Over 5% | `o5` | No |
| Over 6% | `o6` | No |
| Over 7% | `o7` | No |
| Over 8% | `o8` | No |
| Over 9% | `o9` | No |
| Over 10% | `o10` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_divgrowth`

| Field | Value |
| --- | --- |
| Label | Dividend Growth |
| Control ID | fs_fa_divgrowth |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 31 |
| Non-empty public options | 30 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_divgrowth_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| 1 Year Positive | `1ypos` | No |
| 1 Year Over 5% | `1yo5` | No |
| 1 Year Over 10% | `1yo10` | No |
| 1 Year Over 15% | `1yo15` | No |
| 1 Year Over 20% | `1yo20` | No |
| 1 Year Over 25% | `1yo25` | No |
| 1 Year Over 30% | `1yo30` | No |
| 3 Years Positive | `3ypos` | No |
| 3 Years Over 5% | `3yo5` | No |
| 3 Years Over 10% | `3yo10` | No |
| 3 Years Over 15% | `3yo15` | No |
| 3 Years Over 20% | `3yo20` | No |
| 3 Years Over 25% | `3yo25` | No |
| 3 Years Over 30% | `3yo30` | No |
| 5 Years Positive | `5ypos` | No |
| 5 Years Over 5% | `5yo5` | No |
| 5 Years Over 10% | `5yo10` | No |
| 5 Years Over 15% | `5yo15` | No |
| 5 Years Over 20% | `5yo20` | No |
| 5 Years Over 25% | `5yo25` | No |
| 5 Years Over 30% | `5yo30` | No |
| Growing 1+ Year | `cy1` | No |
| Growing 2+ Years | `cy2` | No |
| Growing 3+ Years | `cy3` | No |
| Growing 4+ Years | `cy4` | No |
| Growing 5+ Years | `cy5` | No |
| Growing 6+ Years | `cy6` | No |
| Growing 7+ Years | `cy7` | No |
| Growing 8+ Years | `cy8` | No |
| Growing 9+ Years | `cy9` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_eps3years`

| Field | Value |
| --- | --- |
| Label | EPS GrowthPast 3 Years |
| Control ID | fs_fa_eps3years |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 17 |
| Non-empty public options | 16 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_eps3years_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Negative (<0%) | `neg` | No |
| Positive (>0%) | `pos` | No |
| Positive Low (0-10%) | `poslow` | No |
| High (>25%) | `high` | No |
| Under 5% | `u5` | No |
| Under 10% | `u10` | No |
| Under 15% | `u15` | No |
| Under 20% | `u20` | No |
| Under 25% | `u25` | No |
| Under 30% | `u30` | No |
| Over 5% | `o5` | No |
| Over 10% | `o10` | No |
| Over 15% | `o15` | No |
| Over 20% | `o20` | No |
| Over 25% | `o25` | No |
| Over 30% | `o30` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_eps5years`

| Field | Value |
| --- | --- |
| Label | EPS GrowthPast 5 Years |
| Control ID | fs_fa_eps5years |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 17 |
| Non-empty public options | 16 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_eps5years_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Negative (<0%) | `neg` | No |
| Positive (>0%) | `pos` | No |
| Positive Low (0-10%) | `poslow` | No |
| High (>25%) | `high` | No |
| Under 5% | `u5` | No |
| Under 10% | `u10` | No |
| Under 15% | `u15` | No |
| Under 20% | `u20` | No |
| Under 25% | `u25` | No |
| Under 30% | `u30` | No |
| Over 5% | `o5` | No |
| Over 10% | `o10` | No |
| Over 15% | `o15` | No |
| Over 20% | `o20` | No |
| Over 25% | `o25` | No |
| Over 30% | `o30` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_epsqoq`

| Field | Value |
| --- | --- |
| Label | EPS GrowthQtr Over Qtr |
| Control ID | fs_fa_epsqoq |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 17 |
| Non-empty public options | 16 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_epsqoq_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Negative (<0%) | `neg` | No |
| Positive (>0%) | `pos` | No |
| Positive Low (0-10%) | `poslow` | No |
| High (>25%) | `high` | No |
| Under 5% | `u5` | No |
| Under 10% | `u10` | No |
| Under 15% | `u15` | No |
| Under 20% | `u20` | No |
| Under 25% | `u25` | No |
| Under 30% | `u30` | No |
| Over 5% | `o5` | No |
| Over 10% | `o10` | No |
| Over 15% | `o15` | No |
| Over 20% | `o20` | No |
| Over 25% | `o25` | No |
| Over 30% | `o30` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_epsrev`

| Field | Value |
| --- | --- |
| Label | Earnings & Revenue Surprise |
| Control ID | fs_fa_epsrev |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 48 |
| Non-empty public options | 47 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_epsrev_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Both positive (>0%) | `bp` | No |
| Both met (0%) | `bm` | No |
| Both negative (<0%) | `bn` | No |
| Positive (>0%) | `ep` | No |
| Met (0%) | `em` | No |
| Negative (<0%) | `en` | No |
| Under -100% | `eu100` | No |
| Under -50% | `eu50` | No |
| Under -40% | `eu40` | No |
| Under -30% | `eu30` | No |
| Under -20% | `eu20` | No |
| Under -10% | `eu10` | No |
| Under -5% | `eu5` | No |
| Over 5% | `eo5` | No |
| Over 10% | `eo10` | No |
| Over 20% | `eo20` | No |
| Over 30% | `eo30` | No |
| Over 40% | `eo40` | No |
| Over 50% | `eo50` | No |
| Over 60% | `eo60` | No |
| Over 70% | `eo70` | No |
| Over 80% | `eo80` | No |
| Over 90% | `eo90` | No |
| Over 100% | `eo100` | No |
| Over 200% | `eo200` | No |
| Positive (>0%) | `rp` | No |
| Met (0%) | `rm` | No |
| Negative (<0%) | `rn` | No |
| Under -100% | `ru100` | No |
| Under -50% | `ru50` | No |
| Under -40% | `ru40` | No |
| Under -30% | `ru30` | No |
| Under -20% | `ru20` | No |
| Under -10% | `ru10` | No |
| Under -5% | `ru5` | No |
| Over 5% | `ro5` | No |
| Over 10% | `ro10` | No |
| Over 20% | `ro20` | No |
| Over 30% | `ro30` | No |
| Over 40% | `ro40` | No |
| Over 50% | `ro50` | No |
| Over 60% | `ro60` | No |
| Over 70% | `ro70` | No |
| Over 80% | `ro80` | No |
| Over 90% | `ro90` | No |
| Over 100% | `ro100` | No |
| Over 200% | `ro200` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_epsyoy`

| Field | Value |
| --- | --- |
| Label | EPS GrowthThis Year |
| Control ID | fs_fa_epsyoy |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 17 |
| Non-empty public options | 16 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_epsyoy_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Negative (<0%) | `neg` | No |
| Positive (>0%) | `pos` | No |
| Positive Low (0-10%) | `poslow` | No |
| High (>25%) | `high` | No |
| Under 5% | `u5` | No |
| Under 10% | `u10` | No |
| Under 15% | `u15` | No |
| Under 20% | `u20` | No |
| Under 25% | `u25` | No |
| Under 30% | `u30` | No |
| Over 5% | `o5` | No |
| Over 10% | `o10` | No |
| Over 15% | `o15` | No |
| Over 20% | `o20` | No |
| Over 25% | `o25` | No |
| Over 30% | `o30` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_epsyoy1`

| Field | Value |
| --- | --- |
| Label | EPS GrowthNext Year |
| Control ID | fs_fa_epsyoy1 |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 17 |
| Non-empty public options | 16 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_epsyoy1_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Negative (<0%) | `neg` | No |
| Positive (>0%) | `pos` | No |
| Positive Low (0-10%) | `poslow` | No |
| High (>25%) | `high` | No |
| Under 5% | `u5` | No |
| Under 10% | `u10` | No |
| Under 15% | `u15` | No |
| Under 20% | `u20` | No |
| Under 25% | `u25` | No |
| Under 30% | `u30` | No |
| Over 5% | `o5` | No |
| Over 10% | `o10` | No |
| Over 15% | `o15` | No |
| Over 20% | `o20` | No |
| Over 25% | `o25` | No |
| Over 30% | `o30` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_epsyoyttm`

| Field | Value |
| --- | --- |
| Label | EPS Growth TTM |
| Control ID | fs_fa_epsyoyttm |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 17 |
| Non-empty public options | 16 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_epsyoyttm_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Negative (<0%) | `neg` | No |
| Positive (>0%) | `pos` | No |
| Positive Low (0-10%) | `poslow` | No |
| High (>25%) | `high` | No |
| Under 5% | `u5` | No |
| Under 10% | `u10` | No |
| Under 15% | `u15` | No |
| Under 20% | `u20` | No |
| Under 25% | `u25` | No |
| Under 30% | `u30` | No |
| Over 5% | `o5` | No |
| Over 10% | `o10` | No |
| Over 15% | `o15` | No |
| Over 20% | `o20` | No |
| Over 25% | `o25` | No |
| Over 30% | `o30` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_estltgrowth`

| Field | Value |
| --- | --- |
| Label | EPS GrowthNext 5 Years |
| Control ID | fs_fa_estltgrowth |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 17 |
| Non-empty public options | 16 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_estltgrowth_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Negative (<0%) | `neg` | No |
| Positive (>0%) | `pos` | No |
| Positive Low (<10%) | `poslow` | No |
| High (>25%) | `high` | No |
| Under 5% | `u5` | No |
| Under 10% | `u10` | No |
| Under 15% | `u15` | No |
| Under 20% | `u20` | No |
| Under 25% | `u25` | No |
| Under 30% | `u30` | No |
| Over 5% | `o5` | No |
| Over 10% | `o10` | No |
| Over 15% | `o15` | No |
| Over 20% | `o20` | No |
| Over 25% | `o25` | No |
| Over 30% | `o30` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_evebitda`

| Field | Value |
| --- | --- |
| Label | EV/EBITDA |
| Control ID | fs_fa_evebitda |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 25 |
| Non-empty public options | 24 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_evebitda_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Negative (<0) | `negative` | No |
| Low (<15) | `low` | No |
| Profitable (>0) | `profitable` | No |
| High (>50) | `high` | No |
| Under 5 | `u5` | No |
| Under 10 | `u10` | No |
| Under 15 | `u15` | No |
| Under 20 | `u20` | No |
| Under 25 | `u25` | No |
| Under 30 | `u30` | No |
| Under 35 | `u35` | No |
| Under 40 | `u40` | No |
| Under 45 | `u45` | No |
| Under 50 | `u50` | No |
| Over 5 | `o5` | No |
| Over 10 | `o10` | No |
| Over 15 | `o15` | No |
| Over 20 | `o20` | No |
| Over 25 | `o25` | No |
| Over 30 | `o30` | No |
| Over 35 | `o35` | No |
| Over 40 | `o40` | No |
| Over 45 | `o45` | No |
| Over 50 | `o50` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_evsales`

| Field | Value |
| --- | --- |
| Label | EV/Sales |
| Control ID | fs_fa_evsales |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 25 |
| Non-empty public options | 24 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_evsales_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Negative (<0) | `negative` | No |
| Low (<1) | `low` | No |
| Positive (>0) | `positive` | No |
| High (>10) | `high` | No |
| Under 1 | `u1` | No |
| Under 2 | `u2` | No |
| Under 3 | `u3` | No |
| Under 4 | `u4` | No |
| Under 5 | `u5` | No |
| Under 6 | `u6` | No |
| Under 7 | `u7` | No |
| Under 8 | `u8` | No |
| Under 9 | `u9` | No |
| Under 10 | `u10` | No |
| Over 1 | `o1` | No |
| Over 2 | `o2` | No |
| Over 3 | `o3` | No |
| Over 4 | `o4` | No |
| Over 5 | `o5` | No |
| Over 6 | `o6` | No |
| Over 7 | `o7` | No |
| Over 8 | `o8` | No |
| Over 9 | `o9` | No |
| Over 10 | `o10` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_fpe`

| Field | Value |
| --- | --- |
| Label | Forward P/E |
| Control ID | fs_fa_fpe |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 24 |
| Non-empty public options | 23 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_fpe_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Low (<15) | `low` | No |
| Profitable (>0) | `profitable` | No |
| High (>50) | `high` | No |
| Under 5 | `u5` | No |
| Under 10 | `u10` | No |
| Under 15 | `u15` | No |
| Under 20 | `u20` | No |
| Under 25 | `u25` | No |
| Under 30 | `u30` | No |
| Under 35 | `u35` | No |
| Under 40 | `u40` | No |
| Under 45 | `u45` | No |
| Under 50 | `u50` | No |
| Over 5 | `o5` | No |
| Over 10 | `o10` | No |
| Over 15 | `o15` | No |
| Over 20 | `o20` | No |
| Over 25 | `o25` | No |
| Over 30 | `o30` | No |
| Over 35 | `o35` | No |
| Over 40 | `o40` | No |
| Over 45 | `o45` | No |
| Over 50 | `o50` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_grossmargin`

| Field | Value |
| --- | --- |
| Label | Gross Margin |
| Control ID | fs_fa_grossmargin |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 40 |
| Non-empty public options | 39 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_grossmargin_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Positive (>0%) | `pos` | No |
| Negative (<0%) | `neg` | No |
| High (>50%) | `high` | No |
| Under 90% | `u90` | No |
| Under 80% | `u80` | No |
| Under 70% | `u70` | No |
| Under 60% | `u60` | No |
| Under 50% | `u50` | No |
| Under 45% | `u45` | No |
| Under 40% | `u40` | No |
| Under 35% | `u35` | No |
| Under 30% | `u30` | No |
| Under 25% | `u25` | No |
| Under 20% | `u20` | No |
| Under 15% | `u15` | No |
| Under 10% | `u10` | No |
| Under 5% | `u5` | No |
| Under 0% | `u0` | No |
| Under -10% | `u-10` | No |
| Under -20% | `u-20` | No |
| Under -30% | `u-30` | No |
| Under -50% | `u-50` | No |
| Under -70% | `u-70` | No |
| Under -100% | `u-100` | No |
| Over 0% | `o0` | No |
| Over 5% | `o5` | No |
| Over 10% | `o10` | No |
| Over 15% | `o15` | No |
| Over 20% | `o20` | No |
| Over 25% | `o25` | No |
| Over 30% | `o30` | No |
| Over 35% | `o35` | No |
| Over 40% | `o40` | No |
| Over 45% | `o45` | No |
| Over 50% | `o50` | No |
| Over 60% | `o60` | No |
| Over 70% | `o70` | No |
| Over 80% | `o80` | No |
| Over 90% | `o90` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_ltdebteq`

| Field | Value |
| --- | --- |
| Label | LT Debt/Equity |
| Control ID | fs_fa_ltdebteq |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 23 |
| Non-empty public options | 22 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_ltdebteq_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| High (>0.5) | `high` | No |
| Low (<0.1) | `low` | No |
| Under 1 | `u1` | No |
| Under 0.9 | `u0.9` | No |
| Under 0.8 | `u0.8` | No |
| Under 0.7 | `u0.7` | No |
| Under 0.6 | `u0.6` | No |
| Under 0.5 | `u0.5` | No |
| Under 0.4 | `u0.4` | No |
| Under 0.3 | `u0.3` | No |
| Under 0.2 | `u0.2` | No |
| Under 0.1 | `u0.1` | No |
| Over 0.1 | `o0.1` | No |
| Over 0.2 | `o0.2` | No |
| Over 0.3 | `o0.3` | No |
| Over 0.4 | `o0.4` | No |
| Over 0.5 | `o0.5` | No |
| Over 0.6 | `o0.6` | No |
| Over 0.7 | `o0.7` | No |
| Over 0.8 | `o0.8` | No |
| Over 0.9 | `o0.9` | No |
| Over 1 | `o1` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_netmargin`

| Field | Value |
| --- | --- |
| Label | Net Profit Margin |
| Control ID | fs_fa_netmargin |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 41 |
| Non-empty public options | 40 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_netmargin_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Positive (>0%) | `pos` | No |
| Negative (<0%) | `neg` | No |
| Very Negative (<-20%) | `veryneg` | No |
| High (>20%) | `high` | No |
| Under 90% | `u90` | No |
| Under 80% | `u80` | No |
| Under 70% | `u70` | No |
| Under 60% | `u60` | No |
| Under 50% | `u50` | No |
| Under 45% | `u45` | No |
| Under 40% | `u40` | No |
| Under 35% | `u35` | No |
| Under 30% | `u30` | No |
| Under 25% | `u25` | No |
| Under 20% | `u20` | No |
| Under 15% | `u15` | No |
| Under 10% | `u10` | No |
| Under 5% | `u5` | No |
| Under 0% | `u0` | No |
| Under -10% | `u-10` | No |
| Under -20% | `u-20` | No |
| Under -30% | `u-30` | No |
| Under -50% | `u-50` | No |
| Under -70% | `u-70` | No |
| Under -100% | `u-100` | No |
| Over 0% | `o0` | No |
| Over 5% | `o5` | No |
| Over 10% | `o10` | No |
| Over 15% | `o15` | No |
| Over 20% | `o20` | No |
| Over 25% | `o25` | No |
| Over 30% | `o30` | No |
| Over 35% | `o35` | No |
| Over 40% | `o40` | No |
| Over 45% | `o45` | No |
| Over 50% | `o50` | No |
| Over 60% | `o60` | No |
| Over 70% | `o70` | No |
| Over 80% | `o80` | No |
| Over 90% | `o90` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_opermargin`

| Field | Value |
| --- | --- |
| Label | Operating Margin |
| Control ID | fs_fa_opermargin |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 41 |
| Non-empty public options | 40 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_opermargin_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Positive (>0%) | `pos` | No |
| Negative (<0%) | `neg` | No |
| Very Negative (<-20%) | `veryneg` | No |
| High (>25%) | `high` | No |
| Under 90% | `u90` | No |
| Under 80% | `u80` | No |
| Under 70% | `u70` | No |
| Under 60% | `u60` | No |
| Under 50% | `u50` | No |
| Under 45% | `u45` | No |
| Under 40% | `u40` | No |
| Under 35% | `u35` | No |
| Under 30% | `u30` | No |
| Under 25% | `u25` | No |
| Under 20% | `u20` | No |
| Under 15% | `u15` | No |
| Under 10% | `u10` | No |
| Under 5% | `u5` | No |
| Under 0% | `u0` | No |
| Under -10% | `u-10` | No |
| Under -20% | `u-20` | No |
| Under -30% | `u-30` | No |
| Under -50% | `u-50` | No |
| Under -70% | `u-70` | No |
| Under -100% | `u-100` | No |
| Over 0% | `o0` | No |
| Over 5% | `o5` | No |
| Over 10% | `o10` | No |
| Over 15% | `o15` | No |
| Over 20% | `o20` | No |
| Over 25% | `o25` | No |
| Over 30% | `o30` | No |
| Over 35% | `o35` | No |
| Over 40% | `o40` | No |
| Over 45% | `o45` | No |
| Over 50% | `o50` | No |
| Over 60% | `o60` | No |
| Over 70% | `o70` | No |
| Over 80% | `o80` | No |
| Over 90% | `o90` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_payoutratio`

| Field | Value |
| --- | --- |
| Label | Payout Ratio |
| Control ID | fs_fa_payoutratio |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 26 |
| Non-empty public options | 25 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_payoutratio_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| None (0%) | `none` | No |
| Positive (>0%) | `pos` | No |
| Low (<20%) | `low` | No |
| High (>50%) | `high` | No |
| Over 0% | `o0` | No |
| Over 10% | `o10` | No |
| Over 20% | `o20` | No |
| Over 30% | `o30` | No |
| Over 40% | `o40` | No |
| Over 50% | `o50` | No |
| Over 60% | `o60` | No |
| Over 70% | `o70` | No |
| Over 80% | `o80` | No |
| Over 90% | `o90` | No |
| Over 100% | `o100` | No |
| Under 10% | `u10` | No |
| Under 20% | `u20` | No |
| Under 30% | `u30` | No |
| Under 40% | `u40` | No |
| Under 50% | `u50` | No |
| Under 60% | `u60` | No |
| Under 70% | `u70` | No |
| Under 80% | `u80` | No |
| Under 90% | `u90` | No |
| Under 100% | `u100` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_pb`

| Field | Value |
| --- | --- |
| Label | P/B |
| Control ID | fs_fa_pb |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 23 |
| Non-empty public options | 22 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_pb_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Low (<1) | `low` | No |
| High (>5) | `high` | No |
| Under 1 | `u1` | No |
| Under 2 | `u2` | No |
| Under 3 | `u3` | No |
| Under 4 | `u4` | No |
| Under 5 | `u5` | No |
| Under 6 | `u6` | No |
| Under 7 | `u7` | No |
| Under 8 | `u8` | No |
| Under 9 | `u9` | No |
| Under 10 | `u10` | No |
| Over 1 | `o1` | No |
| Over 2 | `o2` | No |
| Over 3 | `o3` | No |
| Over 4 | `o4` | No |
| Over 5 | `o5` | No |
| Over 6 | `o6` | No |
| Over 7 | `o7` | No |
| Over 8 | `o8` | No |
| Over 9 | `o9` | No |
| Over 10 | `o10` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_pc`

| Field | Value |
| --- | --- |
| Label | Price/Cash |
| Control ID | fs_fa_pc |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 27 |
| Non-empty public options | 26 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_pc_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Low (<3) | `low` | No |
| High (>50) | `high` | No |
| Under 1 | `u1` | No |
| Under 2 | `u2` | No |
| Under 3 | `u3` | No |
| Under 4 | `u4` | No |
| Under 5 | `u5` | No |
| Under 6 | `u6` | No |
| Under 7 | `u7` | No |
| Under 8 | `u8` | No |
| Under 9 | `u9` | No |
| Under 10 | `u10` | No |
| Over 1 | `o1` | No |
| Over 2 | `o2` | No |
| Over 3 | `o3` | No |
| Over 4 | `o4` | No |
| Over 5 | `o5` | No |
| Over 6 | `o6` | No |
| Over 7 | `o7` | No |
| Over 8 | `o8` | No |
| Over 9 | `o9` | No |
| Over 10 | `o10` | No |
| Over 20 | `o20` | No |
| Over 30 | `o30` | No |
| Over 40 | `o40` | No |
| Over 50 | `o50` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_pe`

| Field | Value |
| --- | --- |
| Label | P/E |
| Control ID | fs_fa_pe |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 24 |
| Non-empty public options | 23 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_pe_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Low (<15) | `low` | No |
| Profitable (>0) | `profitable` | No |
| High (>50) | `high` | No |
| Under 5 | `u5` | No |
| Under 10 | `u10` | No |
| Under 15 | `u15` | No |
| Under 20 | `u20` | No |
| Under 25 | `u25` | No |
| Under 30 | `u30` | No |
| Under 35 | `u35` | No |
| Under 40 | `u40` | No |
| Under 45 | `u45` | No |
| Under 50 | `u50` | No |
| Over 5 | `o5` | No |
| Over 10 | `o10` | No |
| Over 15 | `o15` | No |
| Over 20 | `o20` | No |
| Over 25 | `o25` | No |
| Over 30 | `o30` | No |
| Over 35 | `o35` | No |
| Over 40 | `o40` | No |
| Over 45 | `o45` | No |
| Over 50 | `o50` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_peg`

| Field | Value |
| --- | --- |
| Label | PEG |
| Control ID | fs_fa_peg |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 9 |
| Non-empty public options | 8 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_peg_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Low (<1) | `low` | No |
| High (>2) | `high` | No |
| Under 1 | `u1` | No |
| Under 2 | `u2` | No |
| Under 3 | `u3` | No |
| Over 1 | `o1` | No |
| Over 2 | `o2` | No |
| Over 3 | `o3` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_pfcf`

| Field | Value |
| --- | --- |
| Label | Price/Free Cash Flow |
| Control ID | fs_fa_pfcf |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 33 |
| Non-empty public options | 32 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_pfcf_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Low (<15) | `low` | No |
| High (>50) | `high` | No |
| Under 5 | `u5` | No |
| Under 10 | `u10` | No |
| Under 15 | `u15` | No |
| Under 20 | `u20` | No |
| Under 25 | `u25` | No |
| Under 30 | `u30` | No |
| Under 35 | `u35` | No |
| Under 40 | `u40` | No |
| Under 45 | `u45` | No |
| Under 50 | `u50` | No |
| Under 60 | `u60` | No |
| Under 70 | `u70` | No |
| Under 80 | `u80` | No |
| Under 90 | `u90` | No |
| Under 100 | `u100` | No |
| Over 5 | `o5` | No |
| Over 10 | `o10` | No |
| Over 15 | `o15` | No |
| Over 20 | `o20` | No |
| Over 25 | `o25` | No |
| Over 30 | `o30` | No |
| Over 35 | `o35` | No |
| Over 40 | `o40` | No |
| Over 45 | `o45` | No |
| Over 50 | `o50` | No |
| Over 60 | `o60` | No |
| Over 70 | `o70` | No |
| Over 80 | `o80` | No |
| Over 90 | `o90` | No |
| Over 100 | `o100` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_ps`

| Field | Value |
| --- | --- |
| Label | P/S |
| Control ID | fs_fa_ps |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 23 |
| Non-empty public options | 22 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_ps_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Low (<1) | `low` | No |
| High (>10) | `high` | No |
| Under 1 | `u1` | No |
| Under 2 | `u2` | No |
| Under 3 | `u3` | No |
| Under 4 | `u4` | No |
| Under 5 | `u5` | No |
| Under 6 | `u6` | No |
| Under 7 | `u7` | No |
| Under 8 | `u8` | No |
| Under 9 | `u9` | No |
| Under 10 | `u10` | No |
| Over 1 | `o1` | No |
| Over 2 | `o2` | No |
| Over 3 | `o3` | No |
| Over 4 | `o4` | No |
| Over 5 | `o5` | No |
| Over 6 | `o6` | No |
| Over 7 | `o7` | No |
| Over 8 | `o8` | No |
| Over 9 | `o9` | No |
| Over 10 | `o10` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_quickratio`

| Field | Value |
| --- | --- |
| Label | Quick Ratio |
| Control ID | fs_fa_quickratio |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 13 |
| Non-empty public options | 12 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_quickratio_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| High (>3) | `high` | No |
| Low (<0.5) | `low` | No |
| Under 1 | `u1` | No |
| Under 0.5 | `u0.5` | No |
| Over 0.5 | `o0.5` | No |
| Over 1 | `o1` | No |
| Over 1.5 | `o1.5` | No |
| Over 2 | `o2` | No |
| Over 3 | `o3` | No |
| Over 4 | `o4` | No |
| Over 5 | `o5` | No |
| Over 10 | `o10` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_roa`

| Field | Value |
| --- | --- |
| Label | Return on Assets |
| Control ID | fs_fa_roa |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 25 |
| Non-empty public options | 24 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_roa_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Positive (>0%) | `pos` | No |
| Negative (<0%) | `neg` | No |
| Very Positive (>15%) | `verypos` | No |
| Very Negative (<-15%) | `veryneg` | No |
| Under -50% | `u-50` | No |
| Under -45% | `u-45` | No |
| Under -40% | `u-40` | No |
| Under -35% | `u-35` | No |
| Under -30% | `u-30` | No |
| Under -25% | `u-25` | No |
| Under -20% | `u-20` | No |
| Under -15% | `u-15` | No |
| Under -10% | `u-10` | No |
| Under -5% | `u-5` | No |
| Over +5% | `o5` | No |
| Over +10% | `o10` | No |
| Over +15% | `o15` | No |
| Over +20% | `o20` | No |
| Over +25% | `o25` | No |
| Over +30% | `o30` | No |
| Over +35% | `o35` | No |
| Over +40% | `o40` | No |
| Over +45% | `o45` | No |
| Over +50% | `o50` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_roe`

| Field | Value |
| --- | --- |
| Label | Return on Equity |
| Control ID | fs_fa_roe |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 25 |
| Non-empty public options | 24 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_roe_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Positive (>0%) | `pos` | No |
| Negative (<0%) | `neg` | No |
| Very Positive (>30%) | `verypos` | No |
| Very Negative (<-15%) | `veryneg` | No |
| Under -50% | `u-50` | No |
| Under -45% | `u-45` | No |
| Under -40% | `u-40` | No |
| Under -35% | `u-35` | No |
| Under -30% | `u-30` | No |
| Under -25% | `u-25` | No |
| Under -20% | `u-20` | No |
| Under -15% | `u-15` | No |
| Under -10% | `u-10` | No |
| Under -5% | `u-5` | No |
| Over +5% | `o5` | No |
| Over +10% | `o10` | No |
| Over +15% | `o15` | No |
| Over +20% | `o20` | No |
| Over +25% | `o25` | No |
| Over +30% | `o30` | No |
| Over +35% | `o35` | No |
| Over +40% | `o40` | No |
| Over +45% | `o45` | No |
| Over +50% | `o50` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_roi`

| Field | Value |
| --- | --- |
| Label | Return on Invested Capital |
| Control ID | fs_fa_roi |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 25 |
| Non-empty public options | 24 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_roi_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Positive (>0%) | `pos` | No |
| Negative (<0%) | `neg` | No |
| Very Positive (>25%) | `verypos` | No |
| Very Negative (<-10%) | `veryneg` | No |
| Under -50% | `u-50` | No |
| Under -45% | `u-45` | No |
| Under -40% | `u-40` | No |
| Under -35% | `u-35` | No |
| Under -30% | `u-30` | No |
| Under -25% | `u-25` | No |
| Under -20% | `u-20` | No |
| Under -15% | `u-15` | No |
| Under -10% | `u-10` | No |
| Under -5% | `u-5` | No |
| Over +5% | `o5` | No |
| Over +10% | `o10` | No |
| Over +15% | `o15` | No |
| Over +20% | `o20` | No |
| Over +25% | `o25` | No |
| Over +30% | `o30` | No |
| Over +35% | `o35` | No |
| Over +40% | `o40` | No |
| Over +45% | `o45` | No |
| Over +50% | `o50` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_sales3years`

| Field | Value |
| --- | --- |
| Label | Sales GrowthPast 3 Years |
| Control ID | fs_fa_sales3years |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 17 |
| Non-empty public options | 16 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_sales3years_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Negative (<0%) | `neg` | No |
| Positive (>0%) | `pos` | No |
| Positive Low (0-10%) | `poslow` | No |
| High (>25%) | `high` | No |
| Under 5% | `u5` | No |
| Under 10% | `u10` | No |
| Under 15% | `u15` | No |
| Under 20% | `u20` | No |
| Under 25% | `u25` | No |
| Under 30% | `u30` | No |
| Over 5% | `o5` | No |
| Over 10% | `o10` | No |
| Over 15% | `o15` | No |
| Over 20% | `o20` | No |
| Over 25% | `o25` | No |
| Over 30% | `o30` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_sales5years`

| Field | Value |
| --- | --- |
| Label | Sales GrowthPast 5 Years |
| Control ID | fs_fa_sales5years |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 17 |
| Non-empty public options | 16 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_sales5years_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Negative (<0%) | `neg` | No |
| Positive (>0%) | `pos` | No |
| Positive Low (0-10%) | `poslow` | No |
| High (>25%) | `high` | No |
| Under 5% | `u5` | No |
| Under 10% | `u10` | No |
| Under 15% | `u15` | No |
| Under 20% | `u20` | No |
| Under 25% | `u25` | No |
| Under 30% | `u30` | No |
| Over 5% | `o5` | No |
| Over 10% | `o10` | No |
| Over 15% | `o15` | No |
| Over 20% | `o20` | No |
| Over 25% | `o25` | No |
| Over 30% | `o30` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_salesqoq`

| Field | Value |
| --- | --- |
| Label | Sales GrowthQtr Over Qtr |
| Control ID | fs_fa_salesqoq |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 17 |
| Non-empty public options | 16 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_salesqoq_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Negative (<0%) | `neg` | No |
| Positive (>0%) | `pos` | No |
| Positive Low (0-10%) | `poslow` | No |
| High (>25%) | `high` | No |
| Under 5% | `u5` | No |
| Under 10% | `u10` | No |
| Under 15% | `u15` | No |
| Under 20% | `u20` | No |
| Under 25% | `u25` | No |
| Under 30% | `u30` | No |
| Over 5% | `o5` | No |
| Over 10% | `o10` | No |
| Over 15% | `o15` | No |
| Over 20% | `o20` | No |
| Over 25% | `o25` | No |
| Over 30% | `o30` | No |
| Custom (Elite only) | (empty) | Yes |

### `fa_salesyoyttm`

| Field | Value |
| --- | --- |
| Label | Sales Growth TTM |
| Control ID | fs_fa_salesyoyttm |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 17 |
| Non-empty public options | 16 |
| Elite-only options | 1 |
| Template | `v=111&f=fa_salesyoyttm_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Negative (<0%) | `neg` | No |
| Positive (>0%) | `pos` | No |
| Positive Low (0-10%) | `poslow` | No |
| High (>25%) | `high` | No |
| Under 5% | `u5` | No |
| Under 10% | `u10` | No |
| Under 15% | `u15` | No |
| Under 20% | `u20` | No |
| Under 25% | `u25` | No |
| Under 30% | `u30` | No |
| Over 5% | `o5` | No |
| Over 10% | `o10` | No |
| Over 15% | `o15` | No |
| Over 20% | `o20` | No |
| Over 25% | `o25` | No |
| Over 30% | `o30` | No |
| Custom (Elite only) | (empty) | Yes |

### `geo`

| Field | Value |
| --- | --- |
| Label | Country |
| Control ID | fs_geo |
| Control type | select |
| Tabs | 4, 1 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 63 |
| Non-empty public options | 62 |
| Elite-only options | 1 |
| Template | `v=111&f=geo_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| USA | `usa` | No |
| Foreign (ex-USA) | `notusa` | No |
| Asia | `asia` | No |
| Europe | `europe` | No |
| Latin America | `latinamerica` | No |
| BRIC | `bric` | No |
| Argentina | `argentina` | No |
| Australia | `australia` | No |
| Bahamas | `bahamas` | No |
| Belgium | `belgium` | No |
| BeNeLux | `benelux` | No |
| Bermuda | `bermuda` | No |
| Brazil | `brazil` | No |
| Canada | `canada` | No |
| Cayman Islands | `caymanislands` | No |
| Chile | `chile` | No |
| China | `china` | No |
| China & Hong Kong | `chinahongkong` | No |
| Colombia | `colombia` | No |
| Cyprus | `cyprus` | No |
| Denmark | `denmark` | No |
| Finland | `finland` | No |
| France | `france` | No |
| Germany | `germany` | No |
| Greece | `greece` | No |
| Hong Kong | `hongkong` | No |
| Hungary | `hungary` | No |
| Iceland | `iceland` | No |
| India | `india` | No |
| Indonesia | `indonesia` | No |
| Ireland | `ireland` | No |
| Israel | `israel` | No |
| Italy | `italy` | No |
| Japan | `japan` | No |
| Jordan | `jordan` | No |
| Kazakhstan | `kazakhstan` | No |
| Luxembourg | `luxembourg` | No |
| Malaysia | `malaysia` | No |
| Malta | `malta` | No |
| Mexico | `mexico` | No |
| Monaco | `monaco` | No |
| Netherlands | `netherlands` | No |
| New Zealand | `newzealand` | No |
| Norway | `norway` | No |
| Panama | `panama` | No |
| Peru | `peru` | No |
| Philippines | `philippines` | No |
| Portugal | `portugal` | No |
| Russia | `russia` | No |
| Singapore | `singapore` | No |
| South Africa | `southafrica` | No |
| South Korea | `southkorea` | No |
| Spain | `spain` | No |
| Sweden | `sweden` | No |
| Switzerland | `switzerland` | No |
| Taiwan | `taiwan` | No |
| Thailand | `thailand` | No |
| Turkey | `turkey` | No |
| United Arab Emirates | `unitedarabemirates` | No |
| United Kingdom | `unitedkingdom` | No |
| Uruguay | `uruguay` | No |
| Vietnam | `vietnam` | No |
| Custom (Elite only) | (empty) | Yes |

### `idx`

| Field | Value |
| --- | --- |
| Label | Index |
| Control ID | fs_idx |
| Control type | select |
| Tabs | 4, 1 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 5 |
| Non-empty public options | 4 |
| Elite-only options | 1 |
| Template | `v=111&f=idx_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| S&P 500 | `sp500` | No |
| NASDAQ 100 | `ndx` | No |
| DJIA | `dji` | No |
| RUSSELL 2000 | `rut` | No |
| Custom (Elite only) | (empty) | Yes |

### `ind`

| Field | Value |
| --- | --- |
| Label | Industry |
| Control ID | fs_ind |
| Control type | select |
| Tabs | 4, 1 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 152 |
| Non-empty public options | 151 |
| Elite-only options | 1 |
| Template | `v=111&f=ind_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Stocks only (ex-Funds) | `stocksonly` | No |
| Stocks only (ex-Funds & Shell Companies) | `stocksonlyspac` | No |
| Exchange Traded Fund | `exchangetradedfund` | No |
| Advertising Agencies | `advertisingagencies` | No |
| Aerospace & Defense | `aerospacedefense` | No |
| Agricultural Inputs | `agriculturalinputs` | No |
| Airlines | `airlines` | No |
| Airports & Air Services | `airportsairservices` | No |
| Aluminum | `aluminum` | No |
| Apparel Manufacturing | `apparelmanufacturing` | No |
| Apparel Retail | `apparelretail` | No |
| Asset Management | `assetmanagement` | No |
| Auto Manufacturers | `automanufacturers` | No |
| Auto Parts | `autoparts` | No |
| Auto & Truck Dealerships | `autotruckdealerships` | No |
| Banks - Diversified | `banksdiversified` | No |
| Banks - Regional | `banksregional` | No |
| Beverages - Brewers | `beveragesbrewers` | No |
| Beverages - Non-Alcoholic | `beveragesnonalcoholic` | No |
| Beverages - Wineries & Distilleries | `beverageswineriesdistilleries` | No |
| Biotechnology | `biotechnology` | No |
| Broadcasting | `broadcasting` | No |
| Building Materials | `buildingmaterials` | No |
| Building Products & Equipment | `buildingproductsequipment` | No |
| Business Equipment & Supplies | `businessequipmentsupplies` | No |
| Capital Markets | `capitalmarkets` | No |
| Chemicals | `chemicals` | No |
| Closed-End Fund - Debt | `closedendfunddebt` | No |
| Closed-End Fund - Equity | `closedendfundequity` | No |
| Closed-End Fund - Foreign | `closedendfundforeign` | No |
| Coking Coal | `cokingcoal` | No |
| Communication Equipment | `communicationequipment` | No |
| Computer Hardware | `computerhardware` | No |
| Confectioners | `confectioners` | No |
| Conglomerates | `conglomerates` | No |
| Consulting Services | `consultingservices` | No |
| Consumer Electronics | `consumerelectronics` | No |
| Copper | `copper` | No |
| Credit Services | `creditservices` | No |
| Department Stores | `departmentstores` | No |
| Diagnostics & Research | `diagnosticsresearch` | No |
| Discount Stores | `discountstores` | No |
| Drug Manufacturers - General | `drugmanufacturersgeneral` | No |
| Drug Manufacturers - Specialty & Generic | `drugmanufacturersspecialtygeneric` | No |
| Education & Training Services | `educationtrainingservices` | No |
| Electrical Equipment & Parts | `electricalequipmentparts` | No |
| Electronic Components | `electroniccomponents` | No |
| Electronic Gaming & Multimedia | `electronicgamingmultimedia` | No |
| Electronics & Computer Distribution | `electronicscomputerdistribution` | No |
| Engineering & Construction | `engineeringconstruction` | No |
| Entertainment | `entertainment` | No |
| Farm & Heavy Construction Machinery | `farmheavyconstructionmachinery` | No |
| Farm Products | `farmproducts` | No |
| Financial Conglomerates | `financialconglomerates` | No |
| Financial Data & Stock Exchanges | `financialdatastockexchanges` | No |
| Food Distribution | `fooddistribution` | No |
| Footwear & Accessories | `footwearaccessories` | No |
| Furnishings, Fixtures & Appliances | `furnishingsfixturesappliances` | No |
| Gambling | `gambling` | No |
| Gold | `gold` | No |
| Grocery Stores | `grocerystores` | No |
| Healthcare Plans | `healthcareplans` | No |
| Health Information Services | `healthinformationservices` | No |
| Home Improvement Retail | `homeimprovementretail` | No |
| Household & Personal Products | `householdpersonalproducts` | No |
| Industrial Distribution | `industrialdistribution` | No |
| Information Technology Services | `informationtechnologyservices` | No |
| Infrastructure Operations | `infrastructureoperations` | No |
| Insurance Brokers | `insurancebrokers` | No |
| Insurance - Diversified | `insurancediversified` | No |
| Insurance - Life | `insurancelife` | No |
| Insurance - Property & Casualty | `insurancepropertycasualty` | No |
| Insurance - Reinsurance | `insurancereinsurance` | No |
| Insurance - Specialty | `insurancespecialty` | No |
| Integrated Freight & Logistics | `integratedfreightlogistics` | No |
| Internet Content & Information | `internetcontentinformation` | No |
| Internet Retail | `internetretail` | No |
| Leisure | `leisure` | No |
| Lodging | `lodging` | No |
| Lumber & Wood Production | `lumberwoodproduction` | No |
| Luxury Goods | `luxurygoods` | No |
| Marine Shipping | `marineshipping` | No |
| Medical Care Facilities | `medicalcarefacilities` | No |
| Medical Devices | `medicaldevices` | No |
| Medical Distribution | `medicaldistribution` | No |
| Medical Instruments & Supplies | `medicalinstrumentssupplies` | No |
| Metal Fabrication | `metalfabrication` | No |
| Mortgage Finance | `mortgagefinance` | No |
| Oil & Gas Drilling | `oilgasdrilling` | No |
| Oil & Gas E&P | `oilgasep` | No |
| Oil & Gas Equipment & Services | `oilgasequipmentservices` | No |
| Oil & Gas Integrated | `oilgasintegrated` | No |
| Oil & Gas Midstream | `oilgasmidstream` | No |
| Oil & Gas Refining & Marketing | `oilgasrefiningmarketing` | No |
| Other Industrial Metals & Mining | `otherindustrialmetalsmining` | No |
| Other Precious Metals & Mining | `otherpreciousmetalsmining` | No |
| Packaged Foods | `packagedfoods` | No |
| Packaging & Containers | `packagingcontainers` | No |
| Paper & Paper Products | `paperpaperproducts` | No |
| Personal Services | `personalservices` | No |
| Pharmaceutical Retailers | `pharmaceuticalretailers` | No |
| Pollution & Treatment Controls | `pollutiontreatmentcontrols` | No |
| Publishing | `publishing` | No |
| Railroads | `railroads` | No |
| Real Estate - Development | `realestatedevelopment` | No |
| Real Estate - Diversified | `realestatediversified` | No |
| Real Estate Services | `realestateservices` | No |
| Recreational Vehicles | `recreationalvehicles` | No |
| REIT - Diversified | `reitdiversified` | No |
| REIT - Healthcare Facilities | `reithealthcarefacilities` | No |
| REIT - Hotel & Motel | `reithotelmotel` | No |
| REIT - Industrial | `reitindustrial` | No |
| REIT - Mortgage | `reitmortgage` | No |
| REIT - Office | `reitoffice` | No |
| REIT - Residential | `reitresidential` | No |
| REIT - Retail | `reitretail` | No |
| REIT - Specialty | `reitspecialty` | No |
| Rental & Leasing Services | `rentalleasingservices` | No |
| Residential Construction | `residentialconstruction` | No |
| Resorts & Casinos | `resortscasinos` | No |
| Restaurants | `restaurants` | No |
| Scientific & Technical Instruments | `scientifictechnicalinstruments` | No |
| Security & Protection Services | `securityprotectionservices` | No |
| Semiconductor Equipment & Materials | `semiconductorequipmentmaterials` | No |
| Semiconductors | `semiconductors` | No |
| Shell Companies | `shellcompanies` | No |
| Silver | `silver` | No |
| Software - Application | `softwareapplication` | No |
| Software - Infrastructure | `softwareinfrastructure` | No |
| Solar | `solar` | No |
| Specialty Business Services | `specialtybusinessservices` | No |
| Specialty Chemicals | `specialtychemicals` | No |
| Specialty Industrial Machinery | `specialtyindustrialmachinery` | No |
| Specialty Retail | `specialtyretail` | No |
| Staffing & Employment Services | `staffingemploymentservices` | No |
| Steel | `steel` | No |
| Telecom Services | `telecomservices` | No |
| Textile Manufacturing | `textilemanufacturing` | No |
| Thermal Coal | `thermalcoal` | No |
| Tobacco | `tobacco` | No |
| Tools & Accessories | `toolsaccessories` | No |
| Travel Services | `travelservices` | No |
| Trucking | `trucking` | No |
| Uranium | `uranium` | No |
| Utilities - Diversified | `utilitiesdiversified` | No |
| Utilities - Independent Power Producers | `utilitiesindependentpowerproducers` | No |
| Utilities - Regulated Electric | `utilitiesregulatedelectric` | No |
| Utilities - Regulated Gas | `utilitiesregulatedgas` | No |
| Utilities - Regulated Water | `utilitiesregulatedwater` | No |
| Utilities - Renewable | `utilitiesrenewable` | No |
| Waste Management | `wastemanagement` | No |
| Custom (Elite only) | (empty) | Yes |

### `ipodate`

| Field | Value |
| --- | --- |
| Label | IPO Date |
| Control ID | fs_ipodate |
| Control type | select |
| Tabs | 4, 1 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 16 |
| Non-empty public options | 15 |
| Elite-only options | 1 |
| Template | `v=111&f=ipodate_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Today | `today` | No |
| Yesterday | `yesterday` | No |
| In the last week | `prevweek` | No |
| In the last month | `prevmonth` | No |
| In the last quarter | `prevquarter` | No |
| In the last year | `prevyear` | No |
| In the last 2 years | `prev2yrs` | No |
| In the last 3 years | `prev3yrs` | No |
| In the last 5 years | `prev5yrs` | No |
| More than a year ago | `more1` | No |
| More than 5 years ago | `more5` | No |
| More than 10 years ago | `more10` | No |
| More than 15 years ago | `more15` | No |
| More than 20 years ago | `more20` | No |
| More than 25 years ago | `more25` | No |
| Custom (Elite only) | (empty) | Yes |

### `news_date`

| Field | Value |
| --- | --- |
| Label | Latest News |
| Control ID | fs_news_date |
| Control type | select |
| Tabs | 4, 6 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 13 |
| Non-empty public options | 12 |
| Elite-only options | 1 |
| Template | `v=111&f=news_date_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Today | `today` | No |
| Aftermarket Today | `todayafter` | No |
| Since Yesterday | `sinceyesterday` | No |
| Since the Aftermarket Yesterday | `sinceyesterdayafter` | No |
| Yesterday | `yesterday` | No |
| In the Aftermarket Yesterday | `yesterdayafter` | No |
| In the last 5 minutes | `prevminutes5` | No |
| In the last 30 minutes | `prevminutes30` | No |
| In the last hour | `prevhours1` | No |
| In the last 24 hours | `prevhours24` | No |
| In the last 7 days | `prevdays7` | No |
| In the last month | `prevmonth` | No |
| Custom (Elite only) | (empty) | Yes |

### `news_keywords`

| Field | Value |
| --- | --- |
| Label | News Keywords |
| Control ID | ft_news_keywords |
| Control type | input |
| Tabs | 4, 6 |
| Disabled | Yes |
| Publicly queryable | No |
| Public options | 0 |
| Non-empty public options | 0 |
| Elite-only options | 1 |
| Template | `v=111&f=news_keywords_SELECTED-FILTER&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Elite only | `Elite only` | Yes |

### `sec`

| Field | Value |
| --- | --- |
| Label | Sector |
| Control ID | fs_sec |
| Control type | select |
| Tabs | 4, 1 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 12 |
| Non-empty public options | 11 |
| Elite-only options | 1 |
| Template | `v=111&f=sec_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Basic Materials | `basicmaterials` | No |
| Communication Services | `communicationservices` | No |
| Consumer Cyclical | `consumercyclical` | No |
| Consumer Defensive | `consumerdefensive` | No |
| Energy | `energy` | No |
| Financial | `financial` | No |
| Healthcare | `healthcare` | No |
| Industrials | `industrials` | No |
| Real Estate | `realestate` | No |
| Technology | `technology` | No |
| Utilities | `utilities` | No |
| Custom (Elite only) | (empty) | Yes |

### `sh_avgvol`

| Field | Value |
| --- | --- |
| Label | Average Volume |
| Control ID | fs_sh_avgvol |
| Control type | select |
| Tabs | 4, 1 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 19 |
| Non-empty public options | 18 |
| Elite-only options | 1 |
| Template | `v=111&f=sh_avgvol_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Under 50K | `u50` | No |
| Under 100K | `u100` | No |
| Under 500K | `u500` | No |
| Under 750K | `u750` | No |
| Under 1M | `u1000` | No |
| Over 50K | `o50` | No |
| Over 100K | `o100` | No |
| Over 200K | `o200` | No |
| Over 300K | `o300` | No |
| Over 400K | `o400` | No |
| Over 500K | `o500` | No |
| Over 750K | `o750` | No |
| Over 1M | `o1000` | No |
| Over 2M | `o2000` | No |
| 100K to 500K | `100to500` | No |
| 100K to 1M | `100to1000` | No |
| 500K to 1M | `500to1000` | No |
| 500K to 10M | `500to10000` | No |
| Custom (Elite only) | (empty) | Yes |

### `sh_curvol`

| Field | Value |
| --- | --- |
| Label | Current Volume |
| Control ID | fs_sh_curvol |
| Control type | select |
| Tabs | 4, 1 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 29 |
| Non-empty public options | 28 |
| Elite-only options | 1 |
| Template | `v=111&f=sh_curvol_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Under 50K | `u50` | No |
| Under 100K | `u100` | No |
| Under 500K | `u500` | No |
| Under 750K | `u750` | No |
| Under 1M | `u1000` | No |
| Over 0 | `o0` | No |
| Over 50K | `o50` | No |
| Over 100K | `o100` | No |
| Over 200K | `o200` | No |
| Over 300K | `o300` | No |
| Over 400K | `o400` | No |
| Over 500K | `o500` | No |
| Over 750K | `o750` | No |
| Over 1M | `o1000` | No |
| Over 2M | `o2000` | No |
| Over 5M | `o5000` | No |
| Over 10M | `o10000` | No |
| Over 20M | `o20000` | No |
| Over 50% shares float | `o50sf` | No |
| Over 100% shares float | `o100sf` | No |
| Under $1M | `uusd1000` | No |
| Under $10M | `uusd10000` | No |
| Under $100M | `uusd100000` | No |
| Under $1B | `uusd1000000` | No |
| Over $1M | `ousd1000` | No |
| Over $10M | `ousd10000` | No |
| Over $100M | `ousd100000` | No |
| Over $1B | `ousd1000000` | No |
| Custom (Elite only) | (empty) | Yes |

### `sh_float`

| Field | Value |
| --- | --- |
| Label | Float |
| Control ID | fs_sh_float |
| Control type | select |
| Tabs | 4, 1 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 35 |
| Non-empty public options | 34 |
| Elite-only options | 1 |
| Template | `v=111&f=sh_float_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Under 1M | `u1` | No |
| Under 5M | `u5` | No |
| Under 10M | `u10` | No |
| Under 20M | `u20` | No |
| Under 50M | `u50` | No |
| Under 100M | `u100` | No |
| Over 1M | `o1` | No |
| Over 2M | `o2` | No |
| Over 5M | `o5` | No |
| Over 10M | `o10` | No |
| Over 20M | `o20` | No |
| Over 50M | `o50` | No |
| Over 100M | `o100` | No |
| Over 200M | `o200` | No |
| Over 500M | `o500` | No |
| Over 1000M | `o1000` | No |
| Under 10% | `u10p` | No |
| Under 20% | `u20p` | No |
| Under 30% | `u30p` | No |
| Under 40% | `u40p` | No |
| Under 50% | `u50p` | No |
| Under 60% | `u60p` | No |
| Under 70% | `u70p` | No |
| Under 80% | `u80p` | No |
| Under 90% | `u90p` | No |
| Over 10% | `o10p` | No |
| Over 20% | `o20p` | No |
| Over 30% | `o30p` | No |
| Over 40% | `o40p` | No |
| Over 50% | `o50p` | No |
| Over 60% | `o60p` | No |
| Over 70% | `o70p` | No |
| Over 80% | `o80p` | No |
| Over 90% | `o90p` | No |
| Custom (Elite only) | (empty) | Yes |

### `sh_insiderown`

| Field | Value |
| --- | --- |
| Label | InsiderOwnership |
| Control ID | fs_sh_insiderown |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 13 |
| Non-empty public options | 12 |
| Elite-only options | 1 |
| Template | `v=111&f=sh_insiderown_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Low (<5%) | `low` | No |
| High (>30%) | `high` | No |
| Very High (>50%) | `veryhigh` | No |
| Over 10% | `o10` | No |
| Over 20% | `o20` | No |
| Over 30% | `o30` | No |
| Over 40% | `o40` | No |
| Over 50% | `o50` | No |
| Over 60% | `o60` | No |
| Over 70% | `o70` | No |
| Over 80% | `o80` | No |
| Over 90% | `o90` | No |
| Custom (Elite only) | (empty) | Yes |

### `sh_insidertrans`

| Field | Value |
| --- | --- |
| Label | InsiderTransactions |
| Control ID | fs_sh_insidertrans |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 33 |
| Non-empty public options | 32 |
| Elite-only options | 1 |
| Template | `v=111&f=sh_insidertrans_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Very Negative (<20%) | `veryneg` | No |
| Negative (<0%) | `neg` | No |
| Positive (>0%) | `pos` | No |
| Very Positive (>20%) | `verypos` | No |
| Under -90% | `u-90` | No |
| Under -80% | `u-80` | No |
| Under -70% | `u-70` | No |
| Under -60% | `u-60` | No |
| Under -50% | `u-50` | No |
| Under -45% | `u-45` | No |
| Under -40% | `u-40` | No |
| Under -35% | `u-35` | No |
| Under -30% | `u-30` | No |
| Under -25% | `u-25` | No |
| Under -20% | `u-20` | No |
| Under -15% | `u-15` | No |
| Under -10% | `u-10` | No |
| Under -5% | `u-5` | No |
| Over +5% | `o5` | No |
| Over +10% | `o10` | No |
| Over +15% | `o15` | No |
| Over +20% | `o20` | No |
| Over +25% | `o25` | No |
| Over +30% | `o30` | No |
| Over +35% | `o35` | No |
| Over +40% | `o40` | No |
| Over +45% | `o45` | No |
| Over +50% | `o50` | No |
| Over +60% | `o60` | No |
| Over +70% | `o70` | No |
| Over +80% | `o80` | No |
| Over +90% | `o90` | No |
| Custom (Elite only) | (empty) | Yes |

### `sh_instown`

| Field | Value |
| --- | --- |
| Label | InstitutionalOwnership |
| Control ID | fs_sh_instown |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 21 |
| Non-empty public options | 20 |
| Elite-only options | 1 |
| Template | `v=111&f=sh_instown_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Low (<5%) | `low` | No |
| High (>90%) | `high` | No |
| Under 90% | `u90` | No |
| Under 80% | `u80` | No |
| Under 70% | `u70` | No |
| Under 60% | `u60` | No |
| Under 50% | `u50` | No |
| Under 40% | `u40` | No |
| Under 30% | `u30` | No |
| Under 20% | `u20` | No |
| Under 10% | `u10` | No |
| Over 10% | `o10` | No |
| Over 20% | `o20` | No |
| Over 30% | `o30` | No |
| Over 40% | `o40` | No |
| Over 50% | `o50` | No |
| Over 60% | `o60` | No |
| Over 70% | `o70` | No |
| Over 80% | `o80` | No |
| Over 90% | `o90` | No |
| Custom (Elite only) | (empty) | Yes |

### `sh_insttrans`

| Field | Value |
| --- | --- |
| Label | InstitutionalTransactions |
| Control ID | fs_sh_insttrans |
| Control type | select |
| Tabs | 4, 2 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 25 |
| Non-empty public options | 24 |
| Elite-only options | 1 |
| Template | `v=111&f=sh_insttrans_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Very Negative (<20%) | `veryneg` | No |
| Negative (<0%) | `neg` | No |
| Positive (>0%) | `pos` | No |
| Very Positive (>20%) | `verypos` | No |
| Under -50% | `u-50` | No |
| Under -45% | `u-45` | No |
| Under -40% | `u-40` | No |
| Under -35% | `u-35` | No |
| Under -30% | `u-30` | No |
| Under -25% | `u-25` | No |
| Under -20% | `u-20` | No |
| Under -15% | `u-15` | No |
| Under -10% | `u-10` | No |
| Under -5% | `u-5` | No |
| Over +5% | `o5` | No |
| Over +10% | `o10` | No |
| Over +15% | `o15` | No |
| Over +20% | `o20` | No |
| Over +25% | `o25` | No |
| Over +30% | `o30` | No |
| Over +35% | `o35` | No |
| Over +40% | `o40` | No |
| Over +45% | `o45` | No |
| Over +50% | `o50` | No |
| Custom (Elite only) | (empty) | Yes |

### `sh_opt`

| Field | Value |
| --- | --- |
| Label | Option/Short |
| Control ID | fs_sh_opt |
| Control type | select |
| Tabs | 4, 1 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 19 |
| Non-empty public options | 18 |
| Elite-only options | 1 |
| Template | `v=111&f=sh_opt_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Optionable | `option` | No |
| Shortable | `short` | No |
| Not optionable | `notoption` | No |
| Not shortable | `notshort` | No |
| Optionable and shortable | `optionshort` | No |
| Optionable and not shortable | `optionnotshort` | No |
| Not optionable and shortable | `notoptionshort` | No |
| Not optionable and not shortable | `notoptionnotshort` | No |
| Short Sale Restricted (Elite only) | `restricted` | No |
| Halted (Elite only) | `restricted` | No |
| Over 10K available to short | `so10k` | No |
| Over 100K available to short | `so100k` | No |
| Over 1M available to short | `so1m` | No |
| Over 10M available to short | `so10m` | No |
| Over $1M available to short | `uo1m` | No |
| Over $10M available to short | `uo10m` | No |
| Over $100M available to short | `uo100m` | No |
| Over $1B available to short | `uo1b` | No |
| Custom (Elite only) | (empty) | Yes |

### `sh_outstanding`

| Field | Value |
| --- | --- |
| Label | Shares Outstanding |
| Control ID | fs_sh_outstanding |
| Control type | select |
| Tabs | 4, 1 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 17 |
| Non-empty public options | 16 |
| Elite-only options | 1 |
| Template | `v=111&f=sh_outstanding_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Under 1M | `u1` | No |
| Under 5M | `u5` | No |
| Under 10M | `u10` | No |
| Under 20M | `u20` | No |
| Under 50M | `u50` | No |
| Under 100M | `u100` | No |
| Over 1M | `o1` | No |
| Over 2M | `o2` | No |
| Over 5M | `o5` | No |
| Over 10M | `o10` | No |
| Over 20M | `o20` | No |
| Over 50M | `o50` | No |
| Over 100M | `o100` | No |
| Over 200M | `o200` | No |
| Over 500M | `o500` | No |
| Over 1000M | `o1000` | No |
| Custom (Elite only) | (empty) | Yes |

### `sh_price`

| Field | Value |
| --- | --- |
| Label | Price $ |
| Control ID | fs_sh_price |
| Control type | select |
| Tabs | 4, 1 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 41 |
| Non-empty public options | 40 |
| Elite-only options | 1 |
| Template | `v=111&f=sh_price_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Under $1 | `u1` | No |
| Under $2 | `u2` | No |
| Under $3 | `u3` | No |
| Under $4 | `u4` | No |
| Under $5 | `u5` | No |
| Under $7 | `u7` | No |
| Under $10 | `u10` | No |
| Under $15 | `u15` | No |
| Under $20 | `u20` | No |
| Under $30 | `u30` | No |
| Under $40 | `u40` | No |
| Under $50 | `u50` | No |
| Over $1 | `o1` | No |
| Over $2 | `o2` | No |
| Over $3 | `o3` | No |
| Over $4 | `o4` | No |
| Over $5 | `o5` | No |
| Over $7 | `o7` | No |
| Over $10 | `o10` | No |
| Over $15 | `o15` | No |
| Over $20 | `o20` | No |
| Over $30 | `o30` | No |
| Over $40 | `o40` | No |
| Over $50 | `o50` | No |
| Over $60 | `o60` | No |
| Over $70 | `o70` | No |
| Over $80 | `o80` | No |
| Over $90 | `o90` | No |
| Over $100 | `o100` | No |
| $1 to $5 | `1to5` | No |
| $1 to $10 | `1to10` | No |
| $1 to $20 | `1to20` | No |
| $5 to $10 | `5to10` | No |
| $5 to $20 | `5to20` | No |
| $5 to $50 | `5to50` | No |
| $10 to $20 | `10to20` | No |
| $10 to $50 | `10to50` | No |
| $20 to $50 | `20to50` | No |
| $50 to $100 | `50to100` | No |
| Custom (Elite only) | (empty) | Yes |
| Custom TA | `add_tad_0_close::close:d` | No |

### `sh_relvol`

| Field | Value |
| --- | --- |
| Label | Relative Volume |
| Control ID | fs_sh_relvol |
| Control type | select |
| Tabs | 4, 1 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 17 |
| Non-empty public options | 16 |
| Elite-only options | 1 |
| Template | `v=111&f=sh_relvol_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Over 10 | `o10` | No |
| Over 5 | `o5` | No |
| Over 3 | `o3` | No |
| Over 2 | `o2` | No |
| Over 1.5 | `o1.5` | No |
| Over 1 | `o1` | No |
| Over 0.75 | `o0.75` | No |
| Over 0.5 | `o0.5` | No |
| Over 0.25 | `o0.25` | No |
| Under 2 | `u2` | No |
| Under 1.5 | `u1.5` | No |
| Under 1 | `u1` | No |
| Under 0.75 | `u0.75` | No |
| Under 0.5 | `u0.5` | No |
| Under 0.25 | `u0.25` | No |
| Under 0.1 | `u0.1` | No |
| Custom (Elite only) | (empty) | Yes |

### `sh_short`

| Field | Value |
| --- | --- |
| Label | Short Float |
| Control ID | fs_sh_short |
| Control type | select |
| Tabs | 4, 1 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 15 |
| Non-empty public options | 14 |
| Elite-only options | 1 |
| Template | `v=111&f=sh_short_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Low (<5%) | `low` | No |
| High (>20%) | `high` | No |
| Under 5% | `u5` | No |
| Under 10% | `u10` | No |
| Under 15% | `u15` | No |
| Under 20% | `u20` | No |
| Under 25% | `u25` | No |
| Under 30% | `u30` | No |
| Over 5% | `o5` | No |
| Over 10% | `o10` | No |
| Over 15% | `o15` | No |
| Over 20% | `o20` | No |
| Over 25% | `o25` | No |
| Over 30% | `o30` | No |
| Custom (Elite only) | (empty) | Yes |

### `sh_trades`

| Field | Value |
| --- | --- |
| Label | Trades |
| Control ID | fs_sh_trades |
| Control type | select |
| Tabs | 4, 1 |
| Disabled | Yes |
| Publicly queryable | No |
| Public options | 0 |
| Non-empty public options | 0 |
| Elite-only options | 1 |
| Template | `v=111&f=sh_trades_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Elite only | (empty) | Yes |

### `subtheme`

| Field | Value |
| --- | --- |
| Label | Sub-theme |
| Control ID | fs_subtheme |
| Control type | select |
| Tabs | 4, 1 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 269 |
| Non-empty public options | 268 |
| Elite-only options | 1 |
| Template | `v=111&f=subtheme_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Agriculture - Alternative Proteins | `agriculturealtprotein` | No |
| Agriculture - Agricultural Inputs & Crop Science | `agriculturecropinputs` | No |
| Agriculture - Controlled Environment Agriculture | `agricultureindoorfarming` | No |
| Agriculture - Agri-Food Processing & Distribution | `agricultureprocessing` | No |
| Agriculture - Precision Agriculture & Farm Automation | `agriculturesmartfarming` | No |
| AI - Ads, Search & Recommendations | `aiadssearch` | No |
| AI - AGI, general intelligence | `aiagi` | No |
| AI - Apps, Domain-Specific AI | `aiapplications` | No |
| AI - Cloud & Infrastructure | `aicloud` | No |
| AI - Compute & Acceleration | `aicompute` | No |
| AI - Data Infrastructure & Enablement | `aidata` | No |
| AI - Edge & Embedded Systems | `aiedge` | No |
| AI - Power & Energy Solutions | `aienergy` | No |
| AI - Enterprise Productivity & Software Integration | `aienterprise` | No |
| AI - Foundation Models & Platforms | `aimodels` | No |
| AI - Networking & Systems Optimization | `ainetworking` | No |
| AI - Robotics & Automation | `airobotics` | No |
| AI - Cybersecurity | `aisecurity` | No |
| Automation - Factory & Process Automation Systems | `automationautomation` | No |
| Automation - Additive Manufacturing, 3D Printing | `automationdprinting` | No |
| Automation - Industrial IoT, Connectivity | `automationiot` | No |
| Automation - Smart Logistics & Warehouse Automation | `automationlogistics` | No |
| Automation - Industrial Sensors & Machine Vision | `automationmachinevision` | No |
| Automation - Industrial Robotics & Autonomous Systems | `automationrobotics` | No |
| Automation - Industrial Software & Digital Twin | `automationsoftware` | No |
| Autonomous - Vehicles & Mobility | `autonomousavmobility` | No |
| Autonomous - Aerospace, Defense & Drones | `autonomousdefense` | No |
| Autonomous - Industrial & Logistics Automation | `autonomousindustrial` | No |
| Autonomous - Sensors & Perception Systems | `autonomousmachinevision` | No |
| Autonomous - Software & Cloud Infrastructure | `autonomoussoftware` | No |
| Autonomous - Maritime, Agriculture & Specialized Autonomy | `autonomousspecialized` | No |
| Big Data - AI Platforms & Predictive Analytics | `bigdataaiplatforms` | No |
| Big Data - Analytics & Business Intelligence | `bigdataanalyticsbi` | No |
| Big Data - Infrastructure & Storage | `bigdatainfrastructure` | No |
| Big Data - Data Generation, Sourcing & Providers | `bigdataproviders` | No |
| Biometrics - Government, Defense & Public Security | `biometricsgovdefense` | No |
| Biometrics - Biometric Sensors & Hardware | `biometricshardware` | No |
| Biometrics - Identity Verification & Security | `biometricsidentity` | No |
| Biometrics - Recognition & Analytics | `biometricssoftware` | No |
| Blockchain - Enterprise Blockchain Solutions | `blockchainenterprise` | No |
| Blockchain - Blockchain Infrastructure | `blockchaininfrastructure` | No |
| Blockchain - Cryptocurrency Mining & Staking | `blockchainmining` | No |
| Blockchain - Financial Services & Payments | `blockchainpayments` | No |
| Blockchain - Cryptocurrency Platforms | `blockchainplatforms` | No |
| Blockchain - Tokenization & Digital Assets | `blockchaintokenization` | No |
| Cloud - Data Platforms & Databases | `clouddatabases` | No |
| Cloud - Data Centers | `clouddatacenters` | No |
| Cloud - DevOps, Observability | `clouddevops` | No |
| Cloud - Edge, CDN, Zero-Trust Networking | `cloudedge` | No |
| Cloud - Hardware, Networking & OEM | `cloudhardware` | No |
| Cloud - Horizontal SaaS & Cloud Applications | `cloudhsaas` | No |
| Cloud - Hybrid Cloud | `cloudhybridcloud` | No |
| Cloud - Hyperscalers | `cloudhyperscalers` | No |
| Cloud - Multi-Cloud Management | `cloudmulticloud` | No |
| Cloud - Platforms & Services, PaaS | `cloudpaas` | No |
| Cloud - Security | `cloudsecurity` | No |
| Cloud - Serverless Computing | `cloudserverless` | No |
| Comm Agri - Renewable Fuels & Biofuels | `commagribiofuels` | No |
| Comm Agri - Fertilizers, Crop Inputs & Seeds | `commagrifertilizers` | No |
| Comm Agri - Grains & Oilseeds | `commagrigrains` | No |
| Comm Agri - Livestock & Animal Protein | `commagrilivestock` | No |
| Comm Agri - Softs & Plantation Crops | `commagrisofts` | No |
| Comm Energy - Biofuels & Renewable Fuels | `commenergybiofuels` | No |
| Comm Energy - Natural Gas & LNG | `commenergygaslng` | No |
| Comm Energy - Crude Oil | `commenergyoil` | No |
| Comm Energy - Uranium & Nuclear Fuels | `commenergyuranium` | No |
| Comm Metals - Battery & Energy Transition Metals | `commmetalsbattery` | No |
| Comm Metals - Gold | `commmetalsgold` | No |
| Comm Metals - Industrial & Base Metals | `commmetalsindustrial` | No |
| Comm Metals - Precious Metals | `commmetalsprecious` | No |
| Comm Metals - Rare Earth & Strategic Materials | `commmetalsrareearth` | No |
| Comm Metals - Recycling & Circular Materials | `commmetalsrecycling` | No |
| Comm Metals - Silver | `commmetalssilver` | No |
| Consumer - Apparel & E-Commerce Retail | `consumerapparel` | No |
| Consumer - Farming & Direct Marketplaces | `consumerfarmdirect` | No |
| Consumer - Health, Food & Beverages | `consumerfood` | No |
| Consumer - Smart Homes & Household Products | `consumerhousehold` | No |
| Consumer - Modern Luxury & Lifestyle | `consumerluxury` | No |
| Consumer - Resale & Sharing Platforms | `consumersecondhand` | No |
| Cybersecurity - Application Security | `cybersecurityappsecurity` | No |
| Cybersecurity - Cloud Security | `cybersecuritycloud` | No |
| Cybersecurity - Endpoint Security | `cybersecurityendpoint` | No |
| Cybersecurity - Identity & Access Management | `cybersecurityidentityiam` | No |
| Cybersecurity - Network Security | `cybersecuritynetwork` | No |
| Cybersecurity - Security Information & Event Management | `cybersecuritysiem` | No |
| Cybersecurity - Threat Intelligence | `cybersecuritythreatops` | No |
| Cybersecurity - Zero Trust | `cybersecurityzerotrust` | No |
| Defense - Next-Generation Aircraft & Maintenance | `defenseaviation` | No |
| Defense - Cyber Defense & Electronic Warfare | `defensecyberdefense` | No |
| Defense - Drones & Anti-Drone Systems | `defensedrones` | No |
| Defense - Secure Defense Supply Chains | `defensemanufacturing` | No |
| Defense - Missile Defense & Long-Range Weapons | `defensemissiles` | No |
| Defense - Space Technology & Satellite Services | `defensespacetech` | No |
| Defense - Precision Weapons & Ammunition Resupply | `defenseweapons` | No |
| E-commerce - Retail Media & Advertising | `ecommerceadsmedia` | No |
| E-commerce - Direct-to-Consumer | `ecommercedtc` | No |
| E-commerce - Grocery & Local Commerce Platforms | `ecommercegrocery` | No |
| E-commerce - Logistics & Delivery | `ecommercelogistics` | No |
| E-commerce - Online Marketplaces | `ecommercemarketplaces` | No |
| E-commerce - Omnichannel Retailers, Online & Physical Stores | `ecommerceomnichannel` | No |
| E-commerce - Platforms | `ecommerceplatforms` | No |
| E-commerce - Recommerce, Secondhand Marketplaces | `ecommercesecondhand` | No |
| E-commerce - Social & Influencer Commerce | `ecommercesocial` | No |
| Education - Digital Curriculum | `educationcurriculum` | No |
| Education - Infrastructure | `educationinfrastructure` | No |
| Education - Online Learning Platforms | `educationplatforms` | No |
| Education - Workforce Training | `educationworkforce` | No |
| Energy Base - Integrated Energy Majors | `energybasemajors` | No |
| Energy Base - Nuclear Power & Advanced Reactors | `energybasenuclear` | No |
| Energy Base - Oil & Gas Exploration & Production | `energybaseoilproduction` | No |
| Energy Base - Refining & Midstream Infrastructure | `energybaseoilrefining` | No |
| Energy Base - Oilfield Services & Equipment | `energybaseoilservices` | No |
| Energy Base - Coal & Thermal Power Generation | `energybasethermal` | No |
| Energy Base - Utilities & Conventional Power Operators | `energybaseutilities` | No |
| Energy Clean - Batteries & Storage | `energycleanbatteries` | No |
| Energy Clean - Fuels & Bioenergy | `energycleanbiofuels` | No |
| Energy Clean - Geothermal | `energycleangeothermal` | No |
| Energy Clean - Hydrogen & Fuel Cells | `energycleanhydrogen` | No |
| Energy Clean - Materials & Critical Metals | `energycleanmaterials` | No |
| Energy Clean - Smart Grid & Electrification | `energycleansmartgrid` | No |
| Energy Clean - Solar | `energycleansolar` | No |
| Energy Clean - Utilities & Clean Power Operators | `energycleanutilities` | No |
| Energy Clean - Wind | `energycleanwind` | No |
| Entertainment - Sports Betting, Wagering & Prediction Markets | `entertainmentbetting` | No |
| Entertainment - iGaming & Online Gambling | `entertainmentgambling` | No |
| Entertainment - Game Publishers & Developers | `entertainmentgaming` | No |
| Entertainment - Streaming & Gaming Infrastructure | `entertainmentinfrastructure` | No |
| Entertainment - Music & Audio Streaming | `entertainmentmusic` | No |
| Entertainment - Video Streaming | `entertainmentvideo` | No |
| Environmental - Sustainable Agriculture & Resource Management | `environmentalagriculture` | No |
| Environmental - Clean Technologies & Pollution Control | `environmentalairquality` | No |
| Environmental - Climate Technologies & Carbon Solutions | `environmentalclimate` | No |
| Environmental - Waste Management & Recycling | `environmentalwaste` | No |
| Environmental - Water Infrastructure & Treatment | `environmentalwater` | No |
| EVs - Batteries & Materials | `evsbatteries` | No |
| EVs - Charging & Infrastructure | `evscharging` | No |
| EVs - Auto Semiconductors & Power Electronics | `evschips` | No |
| EVs - Fleet Management & Telematics | `evsfleets` | No |
| EVs - Manufacturers | `evsmanufacturers` | No |
| EVs - Autonomous Driving | `evsselfdriving` | No |
| EVs - Key Suppliers & Autonomy Tech | `evssuppliers` | No |
| FinTech - Crypto, Blockchain & Tokenization | `fintechblockchain` | No |
| FinTech - Exchanges & Market Infrastructure | `fintechexchanges` | No |
| FinTech - InsurTech & Embedded Insurance | `fintechinsurance` | No |
| FinTech - Lending, Credit & BNPL | `fintechlending` | No |
| FinTech - Digital Banking & Neobanks | `fintechneobanks` | No |
| FinTech - Digital Payments & Merchant Infrastructure | `fintechpayments` | No |
| FinTech - Trading Platforms & WealthTech | `fintechtrading` | No |
| Hardware - Data Center Infrastructure | `hardwaredatacenters` | No |
| Hardware - Consumer Electronics, Gaming PCs & Consoles | `hardwareelectronics` | No |
| Hardware - Gaming & Immersive Pheriperals | `hardwaregaming` | No |
| Hardware - Industrial & IoT | `hardwareindustrialiot` | No |
| Hardware - Networking Equipment | `hardwarenetworking` | No |
| Hardware - Next-Gen & Specialty | `hardwarenextgen` | No |
| Hardware - Personal Computing & Devices | `hardwarepcsdevices` | No |
| Hardware - Printing & Imaging | `hardwareprinting` | No |
| Hardware - Servers, OEMs & Enterprise Systems | `hardwareservers` | No |
| Hardware - Storage | `hardwarestorage` | No |
| Hardware - Communications & Telecom | `hardwaretelecom` | No |
| Healthcare - Medical Devices & HealthTech Hardware | `healthcaredevices` | No |
| Healthcare - Diagnostics, Biomarkers & Liquid Biopsy | `healthcarediagnostics` | No |
| Healthcare - Genomics & Personalized Medicine | `healthcaregenomics` | No |
| Healthcare - IT, Services & Data Infrastructure | `healthcareitdata` | No |
| Healthcare - Metabolic & Cardiometabolic | `healthcaremetabolic` | No |
| Healthcare - Next-Gen Biotech Platforms | `healthcarenextgen` | No |
| Healthcare - Oncology & Precision Cancer Therapeutics | `healthcareoncology` | No |
| Healthcare - Digital Health, Telemedicine & Remote Care | `healthcaretelemedicine` | No |
| Healthcare - Regenerative Medicine, Psychedelics, Cannabis | `healthcaretherapeutics` | No |
| IoT - Connected Devices & Sensors | `iotedgedevices` | No |
| IoT - Industrial & Enterprise IoT | `iotenterprise` | No |
| IoT - Edge Computing & Hardware Infrastructure | `iothardware` | No |
| IoT - Connectivity & Networks | `iotnetworking` | No |
| IoT - Security & Data Management | `iotsecurity` | No |
| IoT - Platforms, Software & Analytics | `iotsoftware` | No |
| Longevity - Age-Related Pharmaceuticals & Biotech | `longevityagingpharma` | No |
| Longevity - Healthcare & Medical Devices | `longevityhealthcare` | No |
| Longevity - Healthy Aging & Nutrition | `longevityhealthyaging` | No |
| Longevity - Senior Living & Assisted Care | `longevityseniorliving` | No |
| NanoTech - Nanoelectronics & Semiconductors | `nanotechelectronics` | No |
| NanoTech - Energy & Environment | `nanotechenergy` | No |
| NanoTech - Nanomaterials & Manufacturing | `nanotechmaterials` | No |
| NanoTech - Nanomedicine & Drug Delivery | `nanotechmedicine` | No |
| NanoTech - Consumer & Industrial Products | `nanotechproducts` | No |
| NanoTech - Research Tools & Advanced Instruments | `nanotechresearchtools` | No |
| Nutrition - Plant-Based Foods & Meat Alternatives | `nutritionaltprotein` | No |
| Nutrition - Food Delivery & Meal Kits | `nutritionmealdelivery` | No |
| Nutrition - Organic & Natural Food Retailers | `nutritionretailers` | No |
| Nutrition - Functional & Nutritional Supplements | `nutritionsupplements` | No |
| Quantum - Applications | `quantumapplications` | No |
| Quantum - Cloud Ecosystems | `quantumcloud` | No |
| Quantum - Enabling Technologies | `quantumenablingtech` | No |
| Quantum - Hardware Platforms | `quantumhardware` | No |
| Quantum - Networking & Security | `quantumnetworking` | No |
| Quantum - Software & Tools | `quantumsoftware` | No |
| Real Estate - Healthcare & Senior Living | `realestatehealthcare` | No |
| Real Estate - Housing, Urban Living & Demographics | `realestatehousing` | No |
| Real Estate - Digital Infrastructure | `realestateittelecom` | No |
| Real Estate - Office & Commercial Workspaces | `realestateoffice` | No |
| Real Estate - Retail & Consumer Real Estate | `realestateretail` | No |
| Real Estate - Travel, Leisure & Entertainment Properties | `realestatetourism` | No |
| Real Estate - E-Commerce, Warehousing & Logistics | `realestatewarehousing` | No |
| Robotics - Industrial Automation | `roboticsautomation` | No |
| Robotics - Autonomous Vehicles & Mobility | `roboticsavmobility` | No |
| Robotics - Service & Consumer Robotics | `roboticsconsumer` | No |
| Robotics - Logistics & Warehouse Robotics | `roboticslogistics` | No |
| Robotics - Sensors & Vision Systems | `roboticsmachinevision` | No |
| Robotics - Medical & Surgical Robotics | `roboticsmedical` | No |
| Semis - Analog, Mixed-Signal & Power Management | `semisanalog` | No |
| Semis - Logic & CPUs, GPUs, Accelerators | `semiscompute` | No |
| Semis - EDA Tools & Design Software | `semisdesigntools` | No |
| Semis - Foundries & Manufacturing | `semisfoundries` | No |
| Semis - Equipment, Lithography & Deposition | `semislithography` | No |
| Semis - Memory & Storage | `semismemory` | No |
| Semis - Emerging Technologies | `semisnextgen` | No |
| Semis - Testing, Packaging & Assembly | `semispackaging` | No |
| Semis - Wireless & Connectivity | `semiswireless` | No |
| Smart Home - Automation & Control Systems | `smarthomeautomation` | No |
| Smart Home - Connected Devices & Appliances | `smarthomedevices` | No |
| Smart Home - Energy & Utilities | `smarthomeenergy` | No |
| Smart Home - Connectivity & Networking | `smarthomenetworking` | No |
| Smart Home - Security & Monitoring | `smarthomesecurity` | No |
| Smart Home - Voice Assistants & AI Integration | `smarthomevoiceai` | No |
| Social - Advertising Platforms | `socialadvertising` | No |
| Social - Gaming Platforms | `socialgaming` | No |
| Social - Networks & Communication Platforms | `socialnetworks` | No |
| Social - Niche Platforms | `socialniche` | No |
| Social - Image & Video Content Platforms | `socialvisualcontent` | No |
| Software - Collaboration & Communications | `softwarecollaboration` | No |
| Software - Customer Relationship Management & Marketing | `softwarecrm` | No |
| Software - Data & Analytics | `softwaredataanalytics` | No |
| Software - Design, Creativity & Engineering | `softwaredesign` | No |
| Software - DevOps, Management & Observability | `softwaredevops` | No |
| Software - E-Commerce & Digital Platforms | `softwareecommerce` | No |
| Software - Enterprise Resource Planning & Management | `softwareenterprise` | No |
| Software - Gaming & Platforms | `softwaregaming` | No |
| Software - Horizontal SaaS Platforms | `softwarehsaas` | No |
| Software - Operating Systems | `softwareos` | No |
| Software - Cybersecurity | `softwaresecurity` | No |
| Software - Vertical SaaS Platforms | `softwarevsaas` | No |
| Space - Data Analytics & Earth Observation | `spacedataanalytics` | No |
| Space - Defense & Cybersecurity | `spacedefense` | No |
| Space - Infrastructure & Exploration | `spaceinfrastructure` | No |
| Space - Logistics & Launch Services | `spacelaunch` | No |
| Space - Satellite Networks & Connectivity | `spacesatellites` | No |
| Telecom - Cloud & Edge Connectivity | `telecomcloudedge` | No |
| Telecom - Enterprise & Unified Communications | `telecomenterprise` | No |
| Telecom - 5G Technology & Semiconductors | `telecomg` | No |
| Telecom - Infrastructure & Equipment | `telecominfrastructure` | No |
| Telecom - Satellite & Space Communication | `telecomsatcom` | No |
| Telecom - Wireless Networks & Carriers | `telecomwireless` | No |
| Transportation - Air Freight & Express Delivery | `transportationaircargo` | No |
| Transportation - Air Travel & Passenger Transportation | `transportationairtravel` | No |
| Transportation - Infrastructure & Equipment | `transportationinfrastructure` | No |
| Transportation - Marine Shipping & Ports | `transportationmaritime` | No |
| Transportation - Urban Mobility & Emerging Transport Tech | `transportationnextgen` | No |
| Transportation - Freight Rail & Infrastructure | `transportationrail` | No |
| Transportation - Trucking, LTL & Ground Freight | `transportationtrucking` | No |
| Transportation - Logistics, Warehousing & Supply Chain Solutions | `transportationwarehousing` | No |
| V/A Reality - Content & Applications | `varealityapplications` | No |
| V/A Reality - Enterprise & Industrial Solutions | `varealityenterprise` | No |
| V/A Reality - Headsets & Hardware | `varealityhardware` | No |
| V/A Reality - Infrastructure & Cloud Rendering | `varealityinfrastructure` | No |
| V/A Reality - Software Platforms & Operating Systems | `varealitysoftware` | No |
| Wearables - Audio-Visual Immersive Devices | `wearablesimmersive` | No |
| Wearables - Health Monitoring & Medical Devices | `wearablesmedical` | No |
| Wearables - Smartwatches & Fitness Devices | `wearablessmartwatches` | No |
| Wearables - Software & Ecosystems | `wearablessoftware` | No |
| Wearables - Sports, Fitness & Lifestyle Applications | `wearablessport` | No |
| Custom (Elite only) | (empty) | Yes |

### `ta_alltime`

| Field | Value |
| --- | --- |
| Label | All-Time High/Low |
| Control ID | fs_ta_alltime |
| Control type | select |
| Tabs | 4, 3 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 37 |
| Non-empty public options | 36 |
| Elite-only options | 1 |
| Template | `v=111&f=ta_alltime_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| New High | `nh` | No |
| New Low | `nl` | No |
| 5% or more below High | `b5h` | No |
| 10% or more below High | `b10h` | No |
| 15% or more below High | `b15h` | No |
| 20% or more below High | `b20h` | No |
| 30% or more below High | `b30h` | No |
| 40% or more below High | `b40h` | No |
| 50% or more below High | `b50h` | No |
| 60% or more below High | `b60h` | No |
| 70% or more below High | `b70h` | No |
| 80% or more below High | `b80h` | No |
| 90% or more below High | `b90h` | No |
| 0-3% below High | `b0to3h` | No |
| 0-5% below High | `b0to5h` | No |
| 0-10% below High | `b0to10h` | No |
| 5% or more above Low | `a5h` | No |
| 10% or more above Low | `a10h` | No |
| 15% or more above Low | `a15h` | No |
| 20% or more above Low | `a20h` | No |
| 30% or more above Low | `a30h` | No |
| 40% or more above Low | `a40h` | No |
| 50% or more above Low | `a50h` | No |
| 60% or more above Low | `a60h` | No |
| 70% or more above Low | `a70h` | No |
| 80% or more above Low | `a80h` | No |
| 90% or more above Low | `a90h` | No |
| 100% or more above Low | `a100h` | No |
| 120% or more above Low | `a120h` | No |
| 150% or more above Low | `a150h` | No |
| 200% or more above Low | `a200h` | No |
| 300% or more above Low | `a300h` | No |
| 500% or more above Low | `a500h` | No |
| 0-3% above Low | `a0to3h` | No |
| 0-5% above Low | `a0to5h` | No |
| 0-10% above Low | `a0to10h` | No |
| Custom (Elite only) | (empty) | Yes |

### `ta_averagetruerange`

| Field | Value |
| --- | --- |
| Label | Average True Range |
| Control ID | fs_ta_averagetruerange |
| Control type | select |
| Tabs | 4, 3 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 25 |
| Non-empty public options | 24 |
| Elite-only options | 1 |
| Template | `v=111&f=ta_averagetruerange_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Over 0.25 | `o0.25` | No |
| Over 0.5 | `o0.5` | No |
| Over 0.75 | `o0.75` | No |
| Over 1 | `o1` | No |
| Over 1.5 | `o1.5` | No |
| Over 2 | `o2` | No |
| Over 2.5 | `o2.5` | No |
| Over 3 | `o3` | No |
| Over 3.5 | `o3.5` | No |
| Over 4 | `o4` | No |
| Over 4.5 | `o4.5` | No |
| Over 5 | `o5` | No |
| Under 0.25 | `u0.25` | No |
| Under 0.5 | `u0.5` | No |
| Under 0.75 | `u0.75` | No |
| Under 1 | `u1` | No |
| Under 1.5 | `u1.5` | No |
| Under 2 | `u2` | No |
| Under 2.5 | `u2.5` | No |
| Under 3 | `u3` | No |
| Under 3.5 | `u3.5` | No |
| Under 4 | `u4` | No |
| Under 4.5 | `u4.5` | No |
| Under 5 | `u5` | No |
| Custom (Elite only) | (empty) | Yes |

### `ta_beta`

| Field | Value |
| --- | --- |
| Label | Beta |
| Control ID | fs_ta_beta |
| Control type | select |
| Tabs | 4, 3 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 20 |
| Non-empty public options | 19 |
| Elite-only options | 1 |
| Template | `v=111&f=ta_beta_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Under 0 | `u0` | No |
| Under 0.5 | `u0.5` | No |
| Under 1 | `u1` | No |
| Under 1.5 | `u1.5` | No |
| Under 2 | `u2` | No |
| Over 0 | `o0` | No |
| Over 0.5 | `o0.5` | No |
| Over 1 | `o1` | No |
| Over 1.5 | `o1.5` | No |
| Over 2 | `o2` | No |
| Over 2.5 | `o2.5` | No |
| Over 3 | `o3` | No |
| Over 4 | `o4` | No |
| 0 to 0.5 | `0to0.5` | No |
| 0 to 1 | `0to1` | No |
| 0.5 to 1 | `0.5to1` | No |
| 0.5 to 1.5 | `0.5to1.5` | No |
| 1 to 1.5 | `1to1.5` | No |
| 1 to 2 | `1to2` | No |
| Custom (Elite only) | (empty) | Yes |

### `ta_candlestick`

| Field | Value |
| --- | --- |
| Label | Candlestick |
| Control ID | fs_ta_candlestick |
| Control type | select |
| Tabs | 4, 3 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 12 |
| Non-empty public options | 11 |
| Elite-only options | 1 |
| Template | `v=111&f=ta_candlestick_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Long Lower Shadow | `lls` | No |
| Long Upper Shadow | `lus` | No |
| Hammer | `h` | No |
| Inverted Hammer | `ih` | No |
| Spinning Top White | `stw` | No |
| Spinning Top Black | `stb` | No |
| Doji | `d` | No |
| Dragonfly Doji | `dd` | No |
| Gravestone Doji | `gd` | No |
| Marubozu White | `mw` | No |
| Marubozu Black | `mb` | No |
| Custom (Elite only) | (empty) | Yes |

### `ta_change`

| Field | Value |
| --- | --- |
| Label | Change |
| Control ID | fs_ta_change |
| Control type | select |
| Tabs | 4, 3 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 27 |
| Non-empty public options | 26 |
| Elite-only options | 1 |
| Template | `v=111&f=ta_change_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Up | `u` | No |
| Up 1% | `u1` | No |
| Up 2% | `u2` | No |
| Up 3% | `u3` | No |
| Up 4% | `u4` | No |
| Up 5% | `u5` | No |
| Up 6% | `u6` | No |
| Up 7% | `u7` | No |
| Up 8% | `u8` | No |
| Up 9% | `u9` | No |
| Up 10% | `u10` | No |
| Up 15% | `u15` | No |
| Up 20% | `u20` | No |
| Down | `d` | No |
| Down 1% | `d1` | No |
| Down 2% | `d2` | No |
| Down 3% | `d3` | No |
| Down 4% | `d4` | No |
| Down 5% | `d5` | No |
| Down 6% | `d6` | No |
| Down 7% | `d7` | No |
| Down 8% | `d8` | No |
| Down 9% | `d9` | No |
| Down 10% | `d10` | No |
| Down 15% | `d15` | No |
| Down 20% | `d20` | No |
| Custom (Elite only) | (empty) | Yes |

### `ta_changeopen`

| Field | Value |
| --- | --- |
| Label | Change from Open |
| Control ID | fs_ta_changeopen |
| Control type | select |
| Tabs | 4, 3 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 27 |
| Non-empty public options | 26 |
| Elite-only options | 1 |
| Template | `v=111&f=ta_changeopen_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Up | `u` | No |
| Up 1% | `u1` | No |
| Up 2% | `u2` | No |
| Up 3% | `u3` | No |
| Up 4% | `u4` | No |
| Up 5% | `u5` | No |
| Up 6% | `u6` | No |
| Up 7% | `u7` | No |
| Up 8% | `u8` | No |
| Up 9% | `u9` | No |
| Up 10% | `u10` | No |
| Up 15% | `u15` | No |
| Up 20% | `u20` | No |
| Down | `d` | No |
| Down 1% | `d1` | No |
| Down 2% | `d2` | No |
| Down 3% | `d3` | No |
| Down 4% | `d4` | No |
| Down 5% | `d5` | No |
| Down 6% | `d6` | No |
| Down 7% | `d7` | No |
| Down 8% | `d8` | No |
| Down 9% | `d9` | No |
| Down 10% | `d10` | No |
| Down 15% | `d15` | No |
| Down 20% | `d20` | No |
| Custom (Elite only) | (empty) | Yes |

### `ta_gap`

| Field | Value |
| --- | --- |
| Label | Gap |
| Control ID | fs_ta_gap |
| Control type | select |
| Tabs | 4, 3 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 29 |
| Non-empty public options | 28 |
| Elite-only options | 1 |
| Template | `v=111&f=ta_gap_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Up | `u` | No |
| Up 0% | `u0` | No |
| Up 1% | `u1` | No |
| Up 2% | `u2` | No |
| Up 3% | `u3` | No |
| Up 4% | `u4` | No |
| Up 5% | `u5` | No |
| Up 6% | `u6` | No |
| Up 7% | `u7` | No |
| Up 8% | `u8` | No |
| Up 9% | `u9` | No |
| Up 10% | `u10` | No |
| Up 15% | `u15` | No |
| Up 20% | `u20` | No |
| Down | `d` | No |
| Down 0% | `d0` | No |
| Down 1% | `d1` | No |
| Down 2% | `d2` | No |
| Down 3% | `d3` | No |
| Down 4% | `d4` | No |
| Down 5% | `d5` | No |
| Down 6% | `d6` | No |
| Down 7% | `d7` | No |
| Down 8% | `d8` | No |
| Down 9% | `d9` | No |
| Down 10% | `d10` | No |
| Down 15% | `d15` | No |
| Down 20% | `d20` | No |
| Custom (Elite only) | (empty) | Yes |

### `ta_highlow20d`

| Field | Value |
| --- | --- |
| Label | 20-Day High/Low |
| Control ID | fs_ta_highlow20d |
| Control type | select |
| Tabs | 4, 3 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 23 |
| Non-empty public options | 22 |
| Elite-only options | 1 |
| Template | `v=111&f=ta_highlow20d_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| New High | `nh` | No |
| New Low | `nl` | No |
| 5% or more below High | `b5h` | No |
| 10% or more below High | `b10h` | No |
| 15% or more below High | `b15h` | No |
| 20% or more below High | `b20h` | No |
| 30% or more below High | `b30h` | No |
| 40% or more below High | `b40h` | No |
| 50% or more below High | `b50h` | No |
| 0-3% below High | `b0to3h` | No |
| 0-5% below High | `b0to5h` | No |
| 0-10% below High | `b0to10h` | No |
| 5% or more above Low | `a5h` | No |
| 10% or more above Low | `a10h` | No |
| 15% or more above Low | `a15h` | No |
| 20% or more above Low | `a20h` | No |
| 30% or more above Low | `a30h` | No |
| 40% or more above Low | `a40h` | No |
| 50% or more above Low | `a50h` | No |
| 0-3% above Low | `a0to3h` | No |
| 0-5% above Low | `a0to5h` | No |
| 0-10% above Low | `a0to10h` | No |
| Custom (Elite only) | (empty) | Yes |

### `ta_highlow50d`

| Field | Value |
| --- | --- |
| Label | 50-Day High/Low |
| Control ID | fs_ta_highlow50d |
| Control type | select |
| Tabs | 4, 3 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 23 |
| Non-empty public options | 22 |
| Elite-only options | 1 |
| Template | `v=111&f=ta_highlow50d_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| New High | `nh` | No |
| New Low | `nl` | No |
| 5% or more below High | `b5h` | No |
| 10% or more below High | `b10h` | No |
| 15% or more below High | `b15h` | No |
| 20% or more below High | `b20h` | No |
| 30% or more below High | `b30h` | No |
| 40% or more below High | `b40h` | No |
| 50% or more below High | `b50h` | No |
| 0-3% below High | `b0to3h` | No |
| 0-5% below High | `b0to5h` | No |
| 0-10% below High | `b0to10h` | No |
| 5% or more above Low | `a5h` | No |
| 10% or more above Low | `a10h` | No |
| 15% or more above Low | `a15h` | No |
| 20% or more above Low | `a20h` | No |
| 30% or more above Low | `a30h` | No |
| 40% or more above Low | `a40h` | No |
| 50% or more above Low | `a50h` | No |
| 0-3% above Low | `a0to3h` | No |
| 0-5% above Low | `a0to5h` | No |
| 0-10% above Low | `a0to10h` | No |
| Custom (Elite only) | (empty) | Yes |

### `ta_highlow52w`

| Field | Value |
| --- | --- |
| Label | 52-Week High/Low |
| Control ID | fs_ta_highlow52w |
| Control type | select |
| Tabs | 4, 3 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 37 |
| Non-empty public options | 36 |
| Elite-only options | 1 |
| Template | `v=111&f=ta_highlow52w_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| New High | `nh` | No |
| New Low | `nl` | No |
| 5% or more below High | `b5h` | No |
| 10% or more below High | `b10h` | No |
| 15% or more below High | `b15h` | No |
| 20% or more below High | `b20h` | No |
| 30% or more below High | `b30h` | No |
| 40% or more below High | `b40h` | No |
| 50% or more below High | `b50h` | No |
| 60% or more below High | `b60h` | No |
| 70% or more below High | `b70h` | No |
| 80% or more below High | `b80h` | No |
| 90% or more below High | `b90h` | No |
| 0-3% below High | `b0to3h` | No |
| 0-5% below High | `b0to5h` | No |
| 0-10% below High | `b0to10h` | No |
| 5% or more above Low | `a5h` | No |
| 10% or more above Low | `a10h` | No |
| 15% or more above Low | `a15h` | No |
| 20% or more above Low | `a20h` | No |
| 30% or more above Low | `a30h` | No |
| 40% or more above Low | `a40h` | No |
| 50% or more above Low | `a50h` | No |
| 60% or more above Low | `a60h` | No |
| 70% or more above Low | `a70h` | No |
| 80% or more above Low | `a80h` | No |
| 90% or more above Low | `a90h` | No |
| 100% or more above Low | `a100h` | No |
| 120% or more above Low | `a120h` | No |
| 150% or more above Low | `a150h` | No |
| 200% or more above Low | `a200h` | No |
| 300% or more above Low | `a300h` | No |
| 500% or more above Low | `a500h` | No |
| 0-3% above Low | `a0to3h` | No |
| 0-5% above Low | `a0to5h` | No |
| 0-10% above Low | `a0to10h` | No |
| Custom (Elite only) | (empty) | Yes |

### `ta_pattern`

| Field | Value |
| --- | --- |
| Label | Pattern |
| Control ID | fs_ta_pattern |
| Control type | select |
| Tabs | 4, 3 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 29 |
| Non-empty public options | 28 |
| Elite-only options | 1 |
| Template | `v=111&f=ta_pattern_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Horizontal S/R | `horizontal` | No |
| Horizontal S/R (Strong) | `horizontal2` | No |
| TL Resistance | `tlresistance` | No |
| TL Resistance (Strong) | `tlresistance2` | No |
| TL Support | `tlsupport` | No |
| TL Support (Strong) | `tlsupport2` | No |
| Wedge Up | `wedgeup` | No |
| Wedge Up (Strong) | `wedgeup2` | No |
| Wedge Down | `wedgedown` | No |
| Wedge Down (Strong) | `wedgedown2` | No |
| Triangle Ascending | `wedgeresistance` | No |
| Triangle Ascending (Strong) | `wedgeresistance2` | No |
| Triangle Descending | `wedgesupport` | No |
| Triangle Descending (Strong) | `wedgesupport2` | No |
| Wedge | `wedge` | No |
| Wedge (Strong) | `wedge2` | No |
| Channel Up | `channelup` | No |
| Channel Up (Strong) | `channelup2` | No |
| Channel Down | `channeldown` | No |
| Channel Down (Strong) | `channeldown2` | No |
| Channel | `channel` | No |
| Channel (Strong) | `channel2` | No |
| Double Top | `doubletop` | No |
| Double Bottom | `doublebottom` | No |
| Multiple Top | `multipletop` | No |
| Multiple Bottom | `multiplebottom` | No |
| Head & Shoulders | `headandshoulders` | No |
| Head & Shoulders Inverse | `headandshouldersinv` | No |
| Custom (Elite only) | (empty) | Yes |

### `ta_perf`

| Field | Value |
| --- | --- |
| Label | Performance |
| Control ID | fs_ta_perf |
| Control type | select |
| Tabs | 4, 3 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 129 |
| Non-empty public options | 128 |
| Elite-only options | 2 |
| Template | `v=111&f=ta_perf_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Intraday (Elite only) | (empty) | Yes |
| Today Up | `dup` | No |
| Today Down | `ddown` | No |
| Today -15% | `d15u` | No |
| Today -10% | `d10u` | No |
| Today -5% | `d5u` | No |
| Today +5% | `d5o` | No |
| Today +10% | `d10o` | No |
| Today +15% | `d15o` | No |
| Week -30% | `1w30u` | No |
| Week -20% | `1w20u` | No |
| Week -10% | `1w10u` | No |
| Week Down | `1wdown` | No |
| Week Up | `1wup` | No |
| Week +10% | `1w10o` | No |
| Week +20% | `1w20o` | No |
| Week +30% | `1w30o` | No |
| Month -50% | `4w50u` | No |
| Month -30% | `4w30u` | No |
| Month -20% | `4w20u` | No |
| Month -10% | `4w10u` | No |
| Month Down | `4wdown` | No |
| Month Up | `4wup` | No |
| Month +10% | `4w10o` | No |
| Month +20% | `4w20o` | No |
| Month +30% | `4w30o` | No |
| Month +50% | `4w50o` | No |
| Quarter -50% | `13w50u` | No |
| Quarter -30% | `13w30u` | No |
| Quarter -20% | `13w20u` | No |
| Quarter -10% | `13w10u` | No |
| Quarter Down | `13wdown` | No |
| Quarter Up | `13wup` | No |
| Quarter +10% | `13w10o` | No |
| Quarter +20% | `13w20o` | No |
| Quarter +30% | `13w30o` | No |
| Quarter +50% | `13w50o` | No |
| Half -75% | `26w75u` | No |
| Half -50% | `26w50u` | No |
| Half -30% | `26w30u` | No |
| Half -20% | `26w20u` | No |
| Half -10% | `26w10u` | No |
| Half Down | `26wdown` | No |
| Half Up | `26wup` | No |
| Half +10% | `26w10o` | No |
| Half +20% | `26w20o` | No |
| Half +30% | `26w30o` | No |
| Half +50% | `26w50o` | No |
| Half +100% | `26w100o` | No |
| YTD -75% | `ytd75u` | No |
| YTD -50% | `ytd50u` | No |
| YTD -30% | `ytd30u` | No |
| YTD -20% | `ytd20u` | No |
| YTD -10% | `ytd10u` | No |
| YTD -5% | `ytd5u` | No |
| YTD Down | `ytddown` | No |
| YTD Up | `ytdup` | No |
| YTD +5% | `ytd5o` | No |
| YTD +10% | `ytd10o` | No |
| YTD +20% | `ytd20o` | No |
| YTD +30% | `ytd30o` | No |
| YTD +50% | `ytd50o` | No |
| YTD +100% | `ytd100o` | No |
| Year -75% | `52w75u` | No |
| Year -50% | `52w50u` | No |
| Year -30% | `52w30u` | No |
| Year -20% | `52w20u` | No |
| Year -10% | `52w10u` | No |
| Year Down | `52wdown` | No |
| Year Up | `52wup` | No |
| Year +10% | `52w10o` | No |
| Year +20% | `52w20o` | No |
| Year +30% | `52w30o` | No |
| Year +50% | `52w50o` | No |
| Year +100% | `52w100o` | No |
| Year +200% | `52w200o` | No |
| Year +300% | `52w300o` | No |
| Year +500% | `52w500o` | No |
| 3 Years -90% | `3y90u` | No |
| 3 Years -75% | `3y75u` | No |
| 3 Years -50% | `3y50u` | No |
| 3 Years -30% | `3y30u` | No |
| 3 Years -20% | `3y20u` | No |
| 3 Years -10% | `3y10u` | No |
| 3 Years Down | `3ydown` | No |
| 3 Years Up | `3yup` | No |
| 3 Years +10% | `3y10o` | No |
| 3 Years +20% | `3y20o` | No |
| 3 Years +30% | `3y30o` | No |
| 3 Years +50% | `3y50o` | No |
| 3 Years +100% | `3y100o` | No |
| 3 Years +200% | `3y200o` | No |
| 3 Years +300% | `3y300o` | No |
| 3 Years +500% | `3y500o` | No |
| 3 Years +1000% | `3y1000o` | No |
| 5 Years -90% | `5y90u` | No |
| 5 Years -75% | `5y75u` | No |
| 5 Years -50% | `5y50u` | No |
| 5 Years -30% | `5y30u` | No |
| 5 Years -20% | `5y20u` | No |
| 5 Years -10% | `5y10u` | No |
| 5 Years Down | `5ydown` | No |
| 5 Years Up | `5yup` | No |
| 5 Years +10% | `5y10o` | No |
| 5 Years +20% | `5y20o` | No |
| 5 Years +30% | `5y30o` | No |
| 5 Years +50% | `5y50o` | No |
| 5 Years +100% | `5y100o` | No |
| 5 Years +200% | `5y200o` | No |
| 5 Years +300% | `5y300o` | No |
| 5 Years +500% | `5y500o` | No |
| 5 Years +1000% | `5y1000o` | No |
| 10 Years -90% | `10y90u` | No |
| 10 Years -75% | `10y75u` | No |
| 10 Years -50% | `10y50u` | No |
| 10 Years -30% | `10y30u` | No |
| 10 Years -20% | `10y20u` | No |
| 10 Years -10% | `10y10u` | No |
| 10 Years Down | `10ydown` | No |
| 10 Years Up | `10yup` | No |
| 10 Years +10% | `10y10o` | No |
| 10 Years +20% | `10y20o` | No |
| 10 Years +30% | `10y30o` | No |
| 10 Years +50% | `10y50o` | No |
| 10 Years +100% | `10y100o` | No |
| 10 Years +200% | `10y200o` | No |
| 10 Years +300% | `10y300o` | No |
| 10 Years +500% | `10y500o` | No |
| 10 Years +1000% | `10y1000o` | No |
| Custom (Elite only) | (empty) | Yes |

### `ta_perf2`

| Field | Value |
| --- | --- |
| Label | Performance 2 |
| Control ID | fs_ta_perf2 |
| Control type | select |
| Tabs | 4, 3 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 129 |
| Non-empty public options | 128 |
| Elite-only options | 2 |
| Template | `v=111&f=ta_perf2_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Intraday (Elite only) | (empty) | Yes |
| Today Up | `dup` | No |
| Today Down | `ddown` | No |
| Today -15% | `d15u` | No |
| Today -10% | `d10u` | No |
| Today -5% | `d5u` | No |
| Today +5% | `d5o` | No |
| Today +10% | `d10o` | No |
| Today +15% | `d15o` | No |
| Week -30% | `1w30u` | No |
| Week -20% | `1w20u` | No |
| Week -10% | `1w10u` | No |
| Week Down | `1wdown` | No |
| Week Up | `1wup` | No |
| Week +10% | `1w10o` | No |
| Week +20% | `1w20o` | No |
| Week +30% | `1w30o` | No |
| Month -50% | `4w50u` | No |
| Month -30% | `4w30u` | No |
| Month -20% | `4w20u` | No |
| Month -10% | `4w10u` | No |
| Month Down | `4wdown` | No |
| Month Up | `4wup` | No |
| Month +10% | `4w10o` | No |
| Month +20% | `4w20o` | No |
| Month +30% | `4w30o` | No |
| Month +50% | `4w50o` | No |
| Quarter -50% | `13w50u` | No |
| Quarter -30% | `13w30u` | No |
| Quarter -20% | `13w20u` | No |
| Quarter -10% | `13w10u` | No |
| Quarter Down | `13wdown` | No |
| Quarter Up | `13wup` | No |
| Quarter +10% | `13w10o` | No |
| Quarter +20% | `13w20o` | No |
| Quarter +30% | `13w30o` | No |
| Quarter +50% | `13w50o` | No |
| Half -75% | `26w75u` | No |
| Half -50% | `26w50u` | No |
| Half -30% | `26w30u` | No |
| Half -20% | `26w20u` | No |
| Half -10% | `26w10u` | No |
| Half Down | `26wdown` | No |
| Half Up | `26wup` | No |
| Half +10% | `26w10o` | No |
| Half +20% | `26w20o` | No |
| Half +30% | `26w30o` | No |
| Half +50% | `26w50o` | No |
| Half +100% | `26w100o` | No |
| YTD -75% | `ytd75u` | No |
| YTD -50% | `ytd50u` | No |
| YTD -30% | `ytd30u` | No |
| YTD -20% | `ytd20u` | No |
| YTD -10% | `ytd10u` | No |
| YTD -5% | `ytd5u` | No |
| YTD Down | `ytddown` | No |
| YTD Up | `ytdup` | No |
| YTD +5% | `ytd5o` | No |
| YTD +10% | `ytd10o` | No |
| YTD +20% | `ytd20o` | No |
| YTD +30% | `ytd30o` | No |
| YTD +50% | `ytd50o` | No |
| YTD +100% | `ytd100o` | No |
| Year -75% | `52w75u` | No |
| Year -50% | `52w50u` | No |
| Year -30% | `52w30u` | No |
| Year -20% | `52w20u` | No |
| Year -10% | `52w10u` | No |
| Year Down | `52wdown` | No |
| Year Up | `52wup` | No |
| Year +10% | `52w10o` | No |
| Year +20% | `52w20o` | No |
| Year +30% | `52w30o` | No |
| Year +50% | `52w50o` | No |
| Year +100% | `52w100o` | No |
| Year +200% | `52w200o` | No |
| Year +300% | `52w300o` | No |
| Year +500% | `52w500o` | No |
| 3 Years -90% | `3y90u` | No |
| 3 Years -75% | `3y75u` | No |
| 3 Years -50% | `3y50u` | No |
| 3 Years -30% | `3y30u` | No |
| 3 Years -20% | `3y20u` | No |
| 3 Years -10% | `3y10u` | No |
| 3 Years Down | `3ydown` | No |
| 3 Years Up | `3yup` | No |
| 3 Years +10% | `3y10o` | No |
| 3 Years +20% | `3y20o` | No |
| 3 Years +30% | `3y30o` | No |
| 3 Years +50% | `3y50o` | No |
| 3 Years +100% | `3y100o` | No |
| 3 Years +200% | `3y200o` | No |
| 3 Years +300% | `3y300o` | No |
| 3 Years +500% | `3y500o` | No |
| 3 Years +1000% | `3y1000o` | No |
| 5 Years -90% | `5y90u` | No |
| 5 Years -75% | `5y75u` | No |
| 5 Years -50% | `5y50u` | No |
| 5 Years -30% | `5y30u` | No |
| 5 Years -20% | `5y20u` | No |
| 5 Years -10% | `5y10u` | No |
| 5 Years Down | `5ydown` | No |
| 5 Years Up | `5yup` | No |
| 5 Years +10% | `5y10o` | No |
| 5 Years +20% | `5y20o` | No |
| 5 Years +30% | `5y30o` | No |
| 5 Years +50% | `5y50o` | No |
| 5 Years +100% | `5y100o` | No |
| 5 Years +200% | `5y200o` | No |
| 5 Years +300% | `5y300o` | No |
| 5 Years +500% | `5y500o` | No |
| 5 Years +1000% | `5y1000o` | No |
| 10 Years -90% | `10y90u` | No |
| 10 Years -75% | `10y75u` | No |
| 10 Years -50% | `10y50u` | No |
| 10 Years -30% | `10y30u` | No |
| 10 Years -20% | `10y20u` | No |
| 10 Years -10% | `10y10u` | No |
| 10 Years Down | `10ydown` | No |
| 10 Years Up | `10yup` | No |
| 10 Years +10% | `10y10o` | No |
| 10 Years +20% | `10y20o` | No |
| 10 Years +30% | `10y30o` | No |
| 10 Years +50% | `10y50o` | No |
| 10 Years +100% | `10y100o` | No |
| 10 Years +200% | `10y200o` | No |
| 10 Years +300% | `10y300o` | No |
| 10 Years +500% | `10y500o` | No |
| 10 Years +1000% | `10y1000o` | No |
| Custom (Elite only) | (empty) | Yes |

### `ta_rsi`

| Field | Value |
| --- | --- |
| Label | RSI (14) |
| Control ID | fs_ta_rsi |
| Control type | select |
| Tabs | 4, 3 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 13 |
| Non-empty public options | 12 |
| Elite-only options | 1 |
| Template | `v=111&f=ta_rsi_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Overbought (90) | `ob90` | No |
| Overbought (80) | `ob80` | No |
| Overbought (70) | `ob70` | No |
| Overbought (60) | `ob60` | No |
| Oversold (40) | `os40` | No |
| Oversold (30) | `os30` | No |
| Oversold (20) | `os20` | No |
| Oversold (10) | `os10` | No |
| Not Overbought (<60) | `nob60` | No |
| Not Overbought (<50) | `nob50` | No |
| Not Oversold (>50) | `nos50` | No |
| Not Oversold (>40) | `nos40` | No |
| Custom (Elite only) | (empty) | Yes |

### `ta_sma20`

| Field | Value |
| --- | --- |
| Label | 20-Day Simple Moving Average |
| Control ID | fs_ta_sma20 |
| Control type | select |
| Tabs | 4, 3 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 26 |
| Non-empty public options | 25 |
| Elite-only options | 1 |
| Template | `v=111&f=ta_sma20_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Price below SMA20 | `pb` | No |
| Price 10% below SMA20 | `pb10` | No |
| Price 20% below SMA20 | `pb20` | No |
| Price 30% below SMA20 | `pb30` | No |
| Price 40% below SMA20 | `pb40` | No |
| Price 50% below SMA20 | `pb50` | No |
| Price above SMA20 | `pa` | No |
| Price 10% above SMA20 | `pa10` | No |
| Price 20% above SMA20 | `pa20` | No |
| Price 30% above SMA20 | `pa30` | No |
| Price 40% above SMA20 | `pa40` | No |
| Price 50% above SMA20 | `pa50` | No |
| Price crossed SMA20 | `pc` | No |
| Price crossed SMA20 above | `pca` | No |
| Price crossed SMA20 below | `pcb` | No |
| SMA20 crossed SMA50 | `cross50` | No |
| SMA20 crossed SMA50 above | `cross50a` | No |
| SMA20 crossed SMA50 below | `cross50b` | No |
| SMA20 crossed SMA200 | `cross200` | No |
| SMA20 crossed SMA200 above | `cross200a` | No |
| SMA20 crossed SMA200 below | `cross200b` | No |
| SMA20 above SMA50 | `sa50` | No |
| SMA20 below SMA50 | `sb50` | No |
| SMA20 above SMA200 | `sa200` | No |
| SMA20 below SMA200 | `sb200` | No |
| Custom (Elite only) | (empty) | Yes |

### `ta_sma200`

| Field | Value |
| --- | --- |
| Label | 200-Day Simple Moving Average |
| Control ID | fs_ta_sma200 |
| Control type | select |
| Tabs | 4, 3 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 35 |
| Non-empty public options | 34 |
| Elite-only options | 1 |
| Template | `v=111&f=ta_sma200_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Price below SMA200 | `pb` | No |
| Price 10% below SMA200 | `pb10` | No |
| Price 20% below SMA200 | `pb20` | No |
| Price 30% below SMA200 | `pb30` | No |
| Price 40% below SMA200 | `pb40` | No |
| Price 50% below SMA200 | `pb50` | No |
| Price 60% below SMA200 | `pb60` | No |
| Price 70% below SMA200 | `pb70` | No |
| Price 80% below SMA200 | `pb80` | No |
| Price 90% below SMA200 | `pb90` | No |
| Price above SMA200 | `pa` | No |
| Price 10% above SMA200 | `pa10` | No |
| Price 20% above SMA200 | `pa20` | No |
| Price 30% above SMA200 | `pa30` | No |
| Price 40% above SMA200 | `pa40` | No |
| Price 50% above SMA200 | `pa50` | No |
| Price 60% above SMA200 | `pa60` | No |
| Price 70% above SMA200 | `pa70` | No |
| Price 80% above SMA200 | `pa80` | No |
| Price 90% above SMA200 | `pa90` | No |
| Price 100% above SMA200 | `pa100` | No |
| Price crossed SMA200 | `pc` | No |
| Price crossed SMA200 above | `pca` | No |
| Price crossed SMA200 below | `pcb` | No |
| SMA200 crossed SMA20 | `cross20` | No |
| SMA200 crossed SMA20 above | `cross20a` | No |
| SMA200 crossed SMA20 below | `cross20b` | No |
| SMA200 crossed SMA50 | `cross50` | No |
| SMA200 crossed SMA50 above | `cross50a` | No |
| SMA200 crossed SMA50 below | `cross50b` | No |
| SMA200 above SMA20 | `sa20` | No |
| SMA200 below SMA20 | `sb20` | No |
| SMA200 above SMA50 | `sa50` | No |
| SMA200 below SMA50 | `sb50` | No |
| Custom (Elite only) | (empty) | Yes |

### `ta_sma50`

| Field | Value |
| --- | --- |
| Label | 50-Day Simple Moving Average |
| Control ID | fs_ta_sma50 |
| Control type | select |
| Tabs | 4, 3 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 26 |
| Non-empty public options | 25 |
| Elite-only options | 1 |
| Template | `v=111&f=ta_sma50_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Price below SMA50 | `pb` | No |
| Price 10% below SMA50 | `pb10` | No |
| Price 20% below SMA50 | `pb20` | No |
| Price 30% below SMA50 | `pb30` | No |
| Price 40% below SMA50 | `pb40` | No |
| Price 50% below SMA50 | `pb50` | No |
| Price above SMA50 | `pa` | No |
| Price 10% above SMA50 | `pa10` | No |
| Price 20% above SMA50 | `pa20` | No |
| Price 30% above SMA50 | `pa30` | No |
| Price 40% above SMA50 | `pa40` | No |
| Price 50% above SMA50 | `pa50` | No |
| Price crossed SMA50 | `pc` | No |
| Price crossed SMA50 above | `pca` | No |
| Price crossed SMA50 below | `pcb` | No |
| SMA50 crossed SMA20 | `cross20` | No |
| SMA50 crossed SMA20 above | `cross20a` | No |
| SMA50 crossed SMA20 below | `cross20b` | No |
| SMA50 crossed SMA200 | `cross200` | No |
| SMA50 crossed SMA200 above | `cross200a` | No |
| SMA50 crossed SMA200 below | `cross200b` | No |
| SMA50 above SMA20 | `sa20` | No |
| SMA50 below SMA20 | `sb20` | No |
| SMA50 above SMA200 | `sa200` | No |
| SMA50 below SMA200 | `sb200` | No |
| Custom (Elite only) | (empty) | Yes |

### `ta_volatility`

| Field | Value |
| --- | --- |
| Label | Volatility |
| Control ID | fs_ta_volatility |
| Control type | select |
| Tabs | 4, 3 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 23 |
| Non-empty public options | 22 |
| Elite-only options | 1 |
| Template | `v=111&f=ta_volatility_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Week - Over 2% | `wo2` | No |
| Week - Over 3% | `wo3` | No |
| Week - Over 4% | `wo4` | No |
| Week - Over 5% | `wo5` | No |
| Week - Over 6% | `wo6` | No |
| Week - Over 7% | `wo7` | No |
| Week - Over 8% | `wo8` | No |
| Week - Over 9% | `wo9` | No |
| Week - Over 10% | `wo10` | No |
| Week - Over 12% | `wo12` | No |
| Week - Over 15% | `wo15` | No |
| Month - Over 2% | `mo2` | No |
| Month - Over 3% | `mo3` | No |
| Month - Over 4% | `mo4` | No |
| Month - Over 5% | `mo5` | No |
| Month - Over 6% | `mo6` | No |
| Month - Over 7% | `mo7` | No |
| Month - Over 8% | `mo8` | No |
| Month - Over 9% | `mo9` | No |
| Month - Over 10% | `mo10` | No |
| Month - Over 12% | `mo12` | No |
| Month - Over 15% | `mo15` | No |
| Custom (Elite only) | (empty) | Yes |

### `targetprice`

| Field | Value |
| --- | --- |
| Label | Target Price |
| Control ID | fs_targetprice |
| Control type | select |
| Tabs | 4, 1 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 15 |
| Non-empty public options | 14 |
| Elite-only options | 1 |
| Template | `v=111&f=targetprice_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| 50% Above Price | `a50` | No |
| 40% Above Price | `a40` | No |
| 30% Above Price | `a30` | No |
| 20% Above Price | `a20` | No |
| 10% Above Price | `a10` | No |
| 5% Above Price | `a5` | No |
| Above Price | `above` | No |
| Below Price | `below` | No |
| 5% Below Price | `b5` | No |
| 10% Below Price | `b10` | No |
| 20% Below Price | `b20` | No |
| 30% Below Price | `b30` | No |
| 40% Below Price | `b40` | No |
| 50% Below Price | `b50` | No |
| Custom (Elite only) | (empty) | Yes |

### `theme`

| Field | Value |
| --- | --- |
| Label | Theme |
| Control ID | fs_theme |
| Control type | select |
| Tabs | 4, 1 |
| Disabled | No |
| Publicly queryable | Yes |
| Public options | 41 |
| Non-empty public options | 40 |
| Elite-only options | 1 |
| Template | `v=111&f=theme_selected_filter&ft=4` |

| Option label | Slug | Elite only |
| --- | --- | --- |
| Any | (empty) | No |
| Aging Population & Longevity | `agingpopulationlongevity` | No |
| Agriculture & FoodTech | `agriculturefoodtech` | No |
| Artificial Intelligence | `artificialintelligence` | No |
| Autonomous Systems | `autonomoussystems` | No |
| Big Data | `bigdata` | No |
| Biometrics | `biometrics` | No |
| Cloud Computing | `cloudcomputing` | No |
| Commodities - Agriculture | `commoditiesagriculture` | No |
| Commodities - Energy | `commoditiesenergy` | No |
| Commodities - Metals | `commoditiesmetals` | No |
| Consumer Goods | `consumergoods` | No |
| Crypto & Blockchain | `cryptoblockchain` | No |
| Cybersecurity | `cybersecurity` | No |
| Defense & Aerospace | `defenseaerospace` | No |
| Digital Entertainment | `digitalentertainment` | No |
| E-commerce | `ecommerce` | No |
| Education Technology | `educationtechnology` | No |
| Electric Vehicles | `electricvehicles` | No |
| Energy - Renewable | `energyrenewable` | No |
| Energy - Traditional | `energytraditional` | No |
| Environmental Sustainability | `environmentalsustainability` | No |
| FinTech | `fintech` | No |
| Hardware | `hardware` | No |
| Healthcare & Biotech | `healthcarebiotech` | No |
| Healthy Food & Nutrition | `healthyfoodnutrition` | No |
| Industrial Automation | `industrialautomation` | No |
| Internet of Things | `internetofthings` | No |
| Nanotechnology | `nanotechnology` | No |
| Quantum Computing | `quantumcomputing` | No |
| Real Estate & REITs | `realestatereits` | No |
| Robotics | `robotics` | No |
| Semiconductors | `semiconductors` | No |
| Smart Home | `smarthome` | No |
| Social Media | `socialmedia` | No |
| Software | `software` | No |
| Space Tech | `spacetech` | No |
| Telecommunications | `telecommunications` | No |
| Transportation & Logistics | `transportationlogistics` | No |
| Virtual & Augmented Reality | `virtualaugmentedreality` | No |
| Wearables | `wearables` | No |
| Custom (Elite only) | (empty) | Yes |



# Household Surplus Lab

An interactive simulator of how much U.S. households have left after paying for essentials, by income group, from 2000 to 2024 (projected to 2026), and what investing part of that surplus would grow to.

**Live:** https://whats-left-over.pages.dev/ · **Version:** 1.0 · **Data last updated:** September 15, 2026

## Run it
Open `index.html` in a modern browser, or serve the folder with any static server (for example `python -m http.server`). There is no build step.

- Fonts load from Google Fonts. Without them the page falls back to system fonts.
- **Save as image** loads html2canvas 1.4.1 from cdnjs (with Subresource Integrity) the first time it is used, so it needs an internet connection.
- Every setting is stored in the URL hash, so a scenario link reopens exactly the same view. Links never hit the server, so old links can't 404.

## Tests
`node tests/model.test.mjs` checks the model against the embedded source tables: every quintile reproduces the BLS averages, the CBO method matches CBO's published quintile rates, portfolios stay finite, Fig. 3 shares sum to 100% and the cumulative curve ends at total wealth, and the wealth-tax and AMT formulas behave as documented. Run it before every deploy.

## Features
- Income groups: quintiles, quartiles, deciles, 90/10, 95/5, 99/1, 50/40/10, or a custom top share.
- Amounts per household (default) or per person.
- Income after tax and including benefits by default (a "Market income only" preset removes both), with four tax methods: CBO federal rates (default, consistent across years), BLS adjusted for its 2013 method change, a fixed 2013–15 BLS rate, or BLS as published (marked on the chart at 2013).
- Benefits and transfers on or off, with a what-if benefit amount.
- Income data: BLS survey as reported (default), or "CBO totals", which rescales each quintile's market income and total transfers to CBO's *Distribution of Household Income* averages (counts the value of health coverage, so it's an upper bound).
- Essential spending categories (food at home, housing, transportation, healthcare, insurance and pensions, and optional education), plus an expense editor to scale categories, edit any year and add a custom expense.
- Children in paid childcare, priced from the Child Care Aware of America 2023 national average and adjusted by the day care CPI.
- Nominal, real (CPI-U) or assumed-inflation dollars.
- Minimum taxes (on income): a simple what-if minimum income tax, or a U.S.-style AMT (income-based) using each year's married-filing-jointly exemption, phase-out and 26%/28% rates (no deductions or filing status).
- Fig. 3, "Where the wealth is": Federal Reserve household net worth by wealth group (top 0.1% to bottom 50%) or income group (top 1% to lowest 20%), as a 100% stacked area with households-vs-wealth bars, a cumulative wealth-by-percentile curve, or average net worth.
- Fig. 4, "What if we taxed wealth?": what-if wealth taxes (flat Warren/Sanders-style, or a Zucman-style minimum) on Fig. 3's data, per household or as total revenue, with a revenue row and published outside estimates. Its settings sit in a panel beside the chart on desktop (sticky while scrolling) and directly below it on phones and tablets.
- Inflation and Investing settings are collapsed by default, with a one-line summary of the current setting; they open automatically when a shared link changes them.
- One-click scenario presets, each with its own share page and preview image (`/s/<preset>/`).
- A plain-English takeaway under each chart, including the median (50th percentile) household in Fig. 1.
- "Where do you fit?": enter a household income to see its approximate 2024 percentile and what that level's average essential costs would leave. Nothing entered is stored or shared.
- An Advanced panel for the tax method, what-if benefit amounts and the minimum tax.
- Investing a share of each year's surplus at historical S&P 500 or assumed returns, shown as a portfolio or stacked on yearly surplus or income.
- Fig. 1 can show income instead of money left, with an optional dotted happiness plateau line (per-household view).
- 2025–2026 projections (shaded and dashed), a data table under each chart, CSV export, a share link and a save-as-image report.
- Responsive layout with a settings sheet on phones and tablets.
- Light and dark themes: follows the system setting, with a System / Light / Dark toggle in the top bar (remembered in the browser). Saved images and printing always use the light theme.

## Data and sources
- **BLS Consumer Expenditure Survey**, "Quintiles of income before taxes": the published table for every year 2000–2024 (income before and after taxes, income limits, household size, food at home, housing, transportation, healthcare, personal insurance and pensions, education, and benefit income). Public domain.
  - Education is BLS's "Education" row: tuition, fees, textbooks, supplies and equipment, excluding student-loan payments. It averages across all households, including those with no education spending, so it is volatile year to year. It is off by default.
  - Benefits = Social Security and retirement income + public assistance, SSI and SNAP + unemployment, workers' compensation and veterans' benefits + regular contributions for support. BLS combines support payments with unemployment from 2013; they are added to 2000–2012 for consistency.
  - The top quintile's 2023 public assistance figure is suppressed by BLS; the 2022 value is used.
  - BLS published no after-tax income for 2024; 2024 after-tax income applies each quintile's 2023 tax share.
  - BLS's 2005 and 2007 spreadsheets truncate the top quintile's lower income limit; the values from BLS's PDF tables are used.
- **CBO**, *The Distribution of Household Income, 2022* (January 2026), supplemental table 9: average federal individual income tax rates by quintile, 2000–2022. Within the top 20%, the same table's rates for the 81st–90th, 91st–95th, 96th–99th percentiles and top 1% set how the rate rises, while the top quintile's average is still matched. Later years reuse 2022. Public domain.
- **BLS CPI-U** annual averages and **BLS CPI for day care and preschool** (CUUR0000SEEB03). 2025 averages 11 months (BLS published no October 2025 index); 2026 averages January–August. Public domain.
- **S&P 500 total returns** (S&P Dow Jones Indices annual figures). 2026 is year to date through September 14, 2026.
- **Happiness plateau line**: Kahneman & Deaton (2010), *High income improves evaluation of life but not emotional well-being*, PNAS 107:16489 (emotional well-being flattened above ~$75,000 of household income; Gallup 2008–09). Killingsworth, Kahneman & Mellers (2023), *Income and emotional well-being: A conflict resolved*, PNAS 120:e2208661120 (the plateau holds only for the least happy 15–20%, at about $100,000). The line is $75,000 in 2008–09 dollars adjusted with CPI-U (about $110,000 in 2024).
- **AMT parameters**: IRS Form 6251 instructions and annual inflation-adjustment revenue procedures (married filing jointly), 2000–2026.
- **Federal Reserve Distributional Financial Accounts** (dfa.zip, `dfa-income-levels-detail.csv`): average household net worth (net worth ÷ household count, Q4, nominal) by income percentile group — bottom 20%, 20–40, 40–60, 60–80, 80–99, top 1% — 2000–2025; and `dfa-networth-levels-detail.csv` by wealth group (top 0.1%, 99–99.9%, 90–99%, 50–90%, bottom 50%) with household counts, for Fig. 3.
- **Wealth tax references** (Fig. 3 tooltips and defaults): Sen. Warren's Ultra-Millionaire Tax (2024: 2% on $50M–$1B, 3% above $1B); Sanders' 2019 Tax on Extreme Wealth brackets; Zucman (2024), *A blueprint for a coordinated minimum effective taxation standard for ultra-high-net-worth individuals* (G20 report: 2% minimum on billionaires; their current effective tax rate is about 0.3% of wealth).
- **Federal Reserve SHED 2024** (*Economic Well-Being of U.S. Households*): 63% of adults would cover a $400 emergency expense with cash or its equivalent (also 63% in 2023). Used as an outside check.
- **Child Care Aware of America**: 2023 national average price of child care, $11,582 per child. Used with attribution.

For the five quintiles, the model reproduces the BLS averages exactly. Finer groupings, projections, childcare, benefit scaling, expense edits, the minimum tax and investing are modeled scenarios, not observations.

**This is an illustrative model, not tax or investment advice.**

**Disclaimer:** This site is for illustration purposes only. It was 100% AI-generated from the sources above, and its math and figures have not been independently checked by a human.

## Author
Patrick Glenn by way of Claude and ChatGPT.

## License
- Code: [MIT](LICENSE).
- Text, charts and derived figures: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Underlying U.S. government data (BLS, CBO) is public domain. Third-party figures (S&P 500 returns, Child Care Aware of America) remain their owners'.

## Privacy
No cookies. Anonymous, privacy-friendly visit counts via Cloudflare Web Analytics (no cookies, no cross-site tracking). Scenario settings live only in the URL. The browser requests fonts from Google Fonts, and html2canvas from cdnjs when an image is saved.

## Files
- `index.html`: the whole site (HTML, CSS and JavaScript).
- `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `site.webmanifest`: icons.
- `og-image.png`: 1200×630 social share image.
- `robots.txt`, `sitemap.xml`: search engine files.
- `LICENSE`: MIT license for the code.

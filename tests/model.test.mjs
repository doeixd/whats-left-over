// Model checks for index.html. Run with: node tests/model.test.mjs
// Extracts the site's main script (the pure model part, before the DOM code) and checks the calculations against
// the published source tables embedded in it.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const main = scripts.at(-1);
const model = main.slice(0, main.indexOf("function legendHTML"));

const tests = String.raw`
let failures = 0, passed = 0;
const check = (name, ok, detail = "") => { if (ok) passed++; else { failures++; console.log("FAIL", name, detail); } };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
rebuildEssentials(); rebuildTaxes();

// 1. Every quintile's modeled average income and spending reproduce the BLS table.
for (const y of YEARS.filter(y => !isProjected(y))) {
  const C = CURVES[y];
  for (let q = 0; q < 5; q++) {
    const bins = [...Array(20)].map((_, j) => q * 20 + j);
    const avg = arr => bins.reduce((t, i) => t + arr[i], 0) / 20;
    check(y + " income q" + q, near(avg(C.income), CE[y][0][q], 1), avg(C.income) + " vs " + CE[y][0][q]);
    for (const k of ESSENTIALS) check(y + " " + k + " q" + q, near(avg(C.essentials[k]), CE[y][FIELDS.indexOf(k)][q], 1));
  }
}

// 2. CBO method: each quintile's average tax / average income before benefits equals CBO's published rate.
for (const y of YEARS) {
  const C = CURVES[y], cbo = CBO_RATES[Math.min(y, CBO_LAST)];
  const market = C.income.map((v, i) => Math.max(0, v - C.transfers[i]));
  for (let q = 0; q < 5; q++) {
    let tax = 0, inc = 0;
    for (let i = q * 20; i < q * 20 + 20; i++) { tax += C.cboRate[i] * market[i]; inc += market[i]; }
    check(y + " CBO rate q" + q, near(100 * tax / inc, cbo[q], 0.01), (100 * tax / inc).toFixed(3) + " vs " + cbo[q]);
  }
}

// 3. Portfolios are finite and never negative under default settings.
{
  const d = buildData();
  check("portfolios finite", d.portfolios.flat().every(v => Number.isFinite(v) && v >= 0));
}

// 4. Fig. 3 wealth shares sum to 100% in every year and grouping; cumulative curve ends at total wealth.
for (const g of ["wealth", "income"]) {
  state.f3Group = g;
  for (const y of WEALTH_YEARS) {
    const d = wealthGroupData(y), total = d.avg.reduce((t, a, j) => t + a * d.hh[j], 0);
    const sum = d.avg.reduce((t, a, j) => t + 100 * a * d.hh[j] / total, 0);
    check(g + " " + y + " shares sum", near(sum, 100, 1e-9));
  }
  const c = wealthCurve(), d = wealthGroupData(WEALTH_LAST);
  check(g + " curve total", near(c.points.at(-1).v, d.avg.reduce((t, a, j) => t + a * d.hh[j], 0), 1));
  check(g + " curve monotone", c.points.every((p, i) => !i || p.v >= c.points[i - 1].v));
}

// 5. Wealth tax formulas.
{
  state.wealthRate = 2; state.wealthThreshold = 50e6; state.wealthPaid = 0.3;
  const cut = 50e6 * CPI[2025] / CPI[INPUT_DOLLAR_YEAR];
  state.wealthMode = "flat";
  check("flat above", near(wealthTaxFor(200e6, 2025), 0.02 * (200e6 - cut), 1e-6));
  check("flat below", wealthTaxFor(10e6, 2025) === 0);
  state.wealthMode = "zucman";
  check("zucman above", near(wealthTaxFor(200e6, 2025), 0.017 * 200e6, 1e-6));
  check("zucman below", wealthTaxFor(10e6, 2025) === 0);
  state.wealthMode = "flat";
}

// 5b. Fig. 4 revenue series equals tax × households, independent of Fig. 3's grouping.
{
  state.wealthMode = "flat"; state.wealthRate = 2; state.wealthThreshold = 50e6; state.f3Group = "income";
  const s = wealthSeries("revenue", "wealth"), d = wealthGroupData(WEALTH_LAST, "wealth");
  const expected = d.avg.reduce((t, a, j) => t + wealthTaxFor(a, WEALTH_LAST) * d.hh[j], 0);
  const got = s.series.reduce((t, x) => t + x.data.at(-1).value, 0);
  check("fig4 revenue uses its own grouping", s.labels[4] === "Top 0.1%" && near(got, expected, 1), got + " vs " + expected);
  state.f3Group = "wealth";
}

// 5c. CBO income option: each quintile's average market income and transfers match CBO (2022 dollars, CPI-grown otherwise).
{
  state.incomeSource = "cbo"; state.includeTransfers = true; state.transferScale = 100;
  for (const y of [2000, 2012, 2022, 2024]) {
    const src = CBO_QUINTILE_INCOME[Math.min(y, CBO_LAST)], f = CPI[y] / CPI[CBO_LAST];
    for (let q = 0; q < 5; q++) {
      let m = 0, t = 0;
      for (let i = q * 20; i < q * 20 + 20; i++) { const d = calcPercentile(y, i + .5); m += d.market; t += d.transfers; }
      check(y + " cbo market q" + q, near(m / 20, src.market[q] * f, 1), (m / 20) + " vs " + src.market[q] * f);
      check(y + " cbo transfers q" + q, near(t / 20, src.transfers[q] * f, 1), (t / 20) + " vs " + src.transfers[q] * f);
    }
  }
  // Income before benefits must rise with the percentile in CBO mode too (no jumps at quintile boundaries).
  state.includeTransfers = false; state.afterTax = false;
  for (const y of YEARS) {
    let drops = 0, prev = -1;
    for (let i = 0; i < 100; i++) { const g = calcPercentile(y, i + .5).gross; if (g < prev - 1) drops++; prev = g; }
    check(y + " cbo market income in percentile order", drops === 0, drops + " drops");
  }
  state.includeTransfers = true; state.afterTax = true;
  state.incomeSource = "bls";
}

// 6. AMT: zero below the exemption, 26%/28% above.
{
  const [ex, , , b28] = AMT_MFJ[2024];
  check("amt below exemption", amtFor(ex - 1, 2024) === 0);
  check("amt 26% band", near(amtFor(ex + 100000, 2024), 26000, 1e-6));
  check("amt positive at 2M", amtFor(2e6, 2024) > 0.26 * b28);
}

console.log(passed + " passed, " + failures + " failed");
if (failures) throw new Error(failures + " model checks failed");
`;

vm.runInNewContext(model + "\n" + tests, { console, Math, Number, Object, Array, JSON, String });

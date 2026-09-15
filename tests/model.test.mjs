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

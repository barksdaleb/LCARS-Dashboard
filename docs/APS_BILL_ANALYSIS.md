APS multi-month bill analysis — September 22, 2026

Implemented in the BHEM interface at `/bhem`, using all 24 records in
`data/history/aps/bills.json`. Source records were not modified. All comparisons
use `totalEnergyCost`, never energy-only subtotals or reconstructed tariff charges.

The current rolling window is the latest 12 billing-end months, October 2025
through September 2026. The corresponding prior window is October 2024 through
September 2025. Records are sorted by actual billing-end date, independently of
JSON order. Matching uses billing-end year/month, not exact day or bill issue date.
The current/prior service spans are September 19, 2025–September 21, 2026 and
September 20, 2024–September 19, 2025. These are 12-bill windows, not normalized
365-day estimates.

| Result | Value |
|---|---:|
| Current rolling 12-month cost | $6,008.88 |
| Corresponding prior-year cost | $6,361.10 |
| Current minus prior-year cost | −$352.22 |
| Cost change percentage | −5.54% |
| Current rolling usage | 32,731 kWh |
| Prior rolling usage | 33,541 kWh |
| Current minus prior-year usage | −810 kWh |
| All 24 actual bill costs combined | $12,369.98 |
| Cumulative net observed reduction, full post-start bills | $226.49 |
| Transition bill reduction, separately reported | $190.45 |
| Including the entire transition bill, context only | $416.94 |
| First annual goal | $500.00 |
| Goal progress, full post-start bills only | 45.30% |
| Remaining to annual goal | $273.51 |

Home Ops started July 29, 2026. Billing intervals use [start, end): a bill ending
on the launch date is pre-Home-Ops; one starting on that date is fully post-start.
There are 22 full pre-Home-Ops bills, one transition bill (July 22–August 19,
2026), and one full post-Home-Ops bill (August 19–September 21, 2026).

The headline cumulative reduction includes only full post-start bills, net of
any increases. Transition bills are shown separately and excluded from the goal;
no costs are prorated across launch. The first goal year is July 29, 2026–July 29,
2027, and only full billing intervals inside that window count. The $416.94
including-transition figure is context, not the goal numerator. No annualized
projection is made.

These are observed year-over-year changes, not proof of causal savings from Home
Ops. Weather, usage, rates and billing-period length may explain changes. The
separate existing tariff model is explicitly labeled as modeled and excluded
from the annual goal.

Usage percentages use the sum of on-peak, off-peak and super-off-peak kWh as the
denominator, weighted by energy rather than averaging monthly percentages.

| Window | On-peak kWh / % | Off-peak kWh / % | Super-off-peak kWh / % | Total kWh |
|---|---:|---:|---:|---:|
| Current rolling 12 | 3,149 / 9.62% | 28,618 / 87.43% | 964 / 2.95% | 32,731 |
| Prior rolling 12 | 3,345 / 9.97% | 29,328 / 87.44% | 868 / 2.59% | 33,541 |
| All 24 bills | 6,494 / 9.80% | 57,946 / 87.44% | 1,832 / 2.76% | 66,272 |

Monthly financial results for all 24 bills follow. All changes are current minus
prior; negative means a reduction. For the oldest 12 bills, the prior-year cost
and usage are the actual historical figures printed on that bill because no
matching older archived record exists. For the latest 12 bills, actual matching
archived bill totals take precedence over printed comparison fields. No rates
are used to estimate missing charges. Missing totals stay unavailable.

| Bill issued | Phase | Actual total | Prior-year total | Cost change | Change % | Prior source |
|---|---|---:|---:|---:|---:|---|
| 2024-10-21 | Pre-Home-Ops | $609.27 | $434.69 | +174.58 | 40.16% | bill-reported prior year |
| 2024-11-20 | Pre-Home-Ops | $270.87 | $311.41 | -40.54 | -13.02% | bill-reported prior year |
| 2024-12-20 | Pre-Home-Ops | $266.80 | $233.35 | +33.45 | 14.33% | bill-reported prior year |
| 2025-01-22 | Pre-Home-Ops | $294.18 | $243.87 | +50.31 | 20.63% | bill-reported prior year |
| 2025-02-19 | Pre-Home-Ops | $248.48 | $216.96 | +31.52 | 14.53% | bill-reported prior year |
| 2025-03-19 | Pre-Home-Ops | $237.74 | $243.49 | -5.75 | -2.36% | bill-reported prior year |
| 2025-04-18 | Pre-Home-Ops | $355.33 | $304.94 | +50.39 | 16.52% | bill-reported prior year |
| 2025-05-20 | Pre-Home-Ops | $465.06 | $553.57 | -88.51 | -15.99% | bill-reported prior year |
| 2025-06-20 | Pre-Home-Ops | $832.88 | $675.21 | +157.67 | 23.35% | bill-reported prior year |
| 2025-07-21 | Pre-Home-Ops | $1,007.54 | $1,026.36 | -18.82 | -1.83% | bill-reported prior year |
| 2025-08-20 | Pre-Home-Ops | $926.13 | $818.16 | +107.97 | 13.20% | bill-reported prior year |
| 2025-09-19 | Pre-Home-Ops | $846.82 | $716.52 | +130.30 | 18.19% | bill-reported prior year |
| 2025-10-20 | Pre-Home-Ops | $528.60 | $609.27 | -80.67 | -13.24% | archived bill |
| 2025-11-18 | Pre-Home-Ops | $344.13 | $270.87 | +73.26 | 27.05% | archived bill |
| 2025-12-19 | Pre-Home-Ops | $235.29 | $266.80 | -31.51 | -11.81% | archived bill |
| 2026-01-21 | Pre-Home-Ops | $280.77 | $294.18 | -13.41 | -4.56% | archived bill |
| 2026-02-20 | Pre-Home-Ops | $254.45 | $248.48 | +5.97 | 2.40% | archived bill |
| 2026-03-20 | Pre-Home-Ops | $348.39 | $237.74 | +110.65 | 46.54% | archived bill |
| 2026-04-20 | Pre-Home-Ops | $470.54 | $355.33 | +115.21 | 32.42% | archived bill |
| 2026-05-22 | Pre-Home-Ops | $499.76 | $465.06 | +34.70 | 7.46% | archived bill |
| 2026-06-22 | Pre-Home-Ops | $856.89 | $832.88 | +24.01 | 2.88% | archived bill |
| 2026-07-22 | Pre-Home-Ops | $834.05 | $1,007.54 | -173.49 | -17.22% | archived bill |
| 2026-08-19 | Transition | $735.68 | $926.13 | -190.45 | -20.56% | archived bill |
| 2026-09-21 | Full post-Home-Ops | $620.33 | $846.82 | -226.49 | -26.75% | archived bill |

Monthly usage results and category percentages:

| Bill issued | kWh | Prior-year kWh | kWh change | Change % | On-peak % | Off-peak % | Super-off-peak % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 2024-10-21 | 3,232 | 2,452 | +780 | 31.81% | 9.84% | 90.16% | 0.00% |
| 2024-11-20 | 1,487 | 1,913 | -426 | -22.27% | 9.08% | 81.57% | 9.35% |
| 2024-12-20 | 1,476 | 1,420 | +56 | 3.94% | 8.33% | 82.52% | 9.15% |
| 2025-01-22 | 1,685 | 1,532 | +153 | 9.99% | 4.63% | 88.72% | 6.65% |
| 2025-02-19 | 1,395 | 1,306 | +89 | 6.81% | 7.03% | 83.80% | 9.18% |
| 2025-03-19 | 1,317 | 1,441 | -124 | -8.61% | 7.14% | 82.84% | 10.02% |
| 2025-04-18 | 1,942 | 1,718 | +224 | 13.04% | 10.50% | 78.06% | 11.43% |
| 2025-05-20 | 2,393 | 2,979 | -586 | -19.67% | 10.24% | 89.76% | 0.00% |
| 2025-06-20 | 4,269 | 3,588 | +681 | 18.98% | 10.54% | 89.46% | 0.00% |
| 2025-07-21 | 5,273 | 5,530 | -257 | -4.65% | 10.51% | 89.49% | 0.00% |
| 2025-08-20 | 4,745 | 4,374 | +371 | 8.48% | 12.14% | 87.86% | 0.00% |
| 2025-09-19 | 4,327 | 3,808 | +519 | 13.63% | 10.86% | 89.14% | 0.00% |
| 2025-10-20 | 2,698 | 3,232 | -534 | -16.52% | 9.82% | 90.18% | 0.00% |
| 2025-11-18 | 1,873 | 1,487 | +386 | 25.96% | 8.81% | 80.57% | 10.62% |
| 2025-12-19 | 1,241 | 1,476 | -235 | -15.92% | 7.57% | 84.37% | 8.06% |
| 2026-01-21 | 1,547 | 1,685 | -138 | -8.19% | 5.17% | 88.30% | 6.53% |
| 2026-02-20 | 1,345 | 1,395 | -50 | -3.58% | 7.51% | 84.24% | 8.25% |
| 2026-03-20 | 1,828 | 1,317 | +511 | 38.80% | 11.54% | 76.86% | 11.60% |
| 2026-04-20 | 2,485 | 1,942 | +543 | 27.96% | 10.99% | 79.32% | 9.70% |
| 2026-05-22 | 2,473 | 2,393 | +80 | 3.34% | 11.52% | 88.48% | 0.00% |
| 2026-06-22 | 4,268 | 4,269 | -1 | -0.02% | 11.53% | 88.47% | 0.00% |
| 2026-07-22 | 4,128 | 5,273 | -1,145 | -21.71% | 12.19% | 87.81% | 0.00% |
| 2026-08-19 | 4,502 | 4,745 | -243 | -5.12% | 8.22% | 91.78% | 0.00% |
| 2026-09-21 | 4,343 | 4,327 | +16 | 0.37% | 7.14% | 92.86% | 0.00% |

Historical demand stays nullable. The 22 older-plan bills show N/A with no demand
charge; they are never assigned invented demand or charge values. August 2026
shows 11.6 kW / $227.19; September 2026 shows 7.3 kW / $142.97. Demand charges are
already included in actual bill totals and are not added again.

The panel uses the existing LCARS cyan borders, orange text, black background,
rounded cards, and green reductions. It includes a usage mix bar, accessible goal
progress bar, and a horizontally scrollable table. A button switches between the
rolling 12 months and all 24 bills. The table includes service dates, phase,
monthly cost and usage comparisons, all three usage shares, and nullable demand.
The data updates when the existing bill JSON is imported and the app is rebuilt.

Validation:

- `node --import tsx --test app/lib/energy/APSBillAnalysis.test.ts components/APSBillHistory.test.tsx scripts/aps-bill-import.test.ts`: **19/19 passed**
  (10 new calculation tests, one new panel render test, eight existing importer
  regression/integration tests). Covers actual historical totals, all 12 current
  monthly comparisons, launch boundaries, goal arithmetic including increases and
  overachievement, transition exclusion, anniversary boundaries, weighted usage,
  missing/null values, duplicate rejection, source immutability and UI output.
- Targeted TypeScript check passed using the repository compiler options and a
  temporary include-only config for all six changed TypeScript/TSX files.
- ESLint passed on both analysis files, both panel files and `SavingsProof.tsx`.
- Linting all changed files also checks `app/bhem/page.tsx`: **four existing errors
  and one existing warning** (three `any` types, a plain internal `<a>`, unused
  `pool`). Linting the unmodified HEAD version through stdin confirmed the same
  diagnostics. No new lint diagnostics were introduced.
- Full `tsc --noEmit --incremental false` remains blocked by unrelated existing
  WaterGuru missing distribution modules/Jest globals/undefined `dashboard`, and
  JackeryClient's missing `testConnection`. These were not modified.
- `npm run build` initially failed fetching Google Fonts in the restricted
  environment. The authorized network-enabled retry **compiled successfully**, then
  failed TypeScript at `research/waterguru/waterguru-api-js/demo/server.ts:4`:
  missing `../../dist/index.js`. The production build did not complete.
- `git diff --check` passed. All six pre-existing modified files were checked
  against their initial SHA-256 hashes and remain byte-for-byte unchanged.
- No commits were made. No restore/reset commands were used.

Files changed by this task:

- `app/lib/energy/APSBillAnalysis.ts` (new): pure analysis, date/period classification,
  actual prior-year matching, rolling totals, usage shares, cumulative results and goal.
- `app/lib/energy/APSBillAnalysis.test.ts` (new): calculation regression tests.
- `components/APSBillHistory.tsx` (new): LCARS bill analysis panel and monthly table.
- `components/APSBillHistory.test.tsx` (new): panel render regression test.
- `app/bhem/page.tsx`: imports and displays the panel.
- `components/SavingsProof.tsx`: clarifies that the separate existing comparison
  is a tariff model, not actual bill reduction or annual-goal progress.
- `docs/APS_BILL_ANALYSIS.md` (new): this results and validation report.

Preserved pre-existing changes: `data/energy.json`, `data/ops/calendar.json`,
`data/ops/countermeasure-performance.json`, `data/ops/daily-performance.json`,
`data/ops/savings.json`, and `scripts/google-calendar-test.ts`.

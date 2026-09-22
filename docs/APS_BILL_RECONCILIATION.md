APS bill reconciliation — September 22, 2026

Reprocessed `/Users/barksdaleb/lcars-dashboard/data/import/aps/archive/bills` with
`node --import tsx scripts/aps-bill-import.ts --reprocess-archive`.
The archive contains 27 PDFs representing 24 distinct billing periods. August 19,
2026 has three copies and September 21, 2026 has two. Duplicate periods were
skipped after checking that their parsed bill records agree. All 27 PDFs remain
byte-for-byte unchanged. History retains exactly 24 unique billing periods.
Reprocessing twice in an isolated test produced byte-identical history.

All 24 bills reconcile exactly; none has a nonzero difference. Twelve bills have
super-off-peak usage, and the other twelve store zero. All existing bill fields
and record ordering were preserved; only superOffPeakKWh was added.

All values below are kWh. Difference = on-peak + off-peak + super-off-peak − usage.

| Bill date | On-peak | Off-peak | Super-off-peak | Usage | Difference |
|---|---:|---:|---:|---:|---:|
| October 21, 2024 | 318 | 2914 | 0 | 3232 | 0 |
| November 20, 2024 | 135 | 1213 | 139 | 1487 | 0 |
| December 20, 2024 | 123 | 1218 | 135 | 1476 | 0 |
| January 22, 2025 | 78 | 1495 | 112 | 1685 | 0 |
| February 19, 2025 | 98 | 1169 | 128 | 1395 | 0 |
| March 19, 2025 | 94 | 1091 | 132 | 1317 | 0 |
| April 18, 2025 | 204 | 1516 | 222 | 1942 | 0 |
| May 20, 2025 | 245 | 2148 | 0 | 2393 | 0 |
| June 20, 2025 | 450 | 3819 | 0 | 4269 | 0 |
| July 21, 2025 | 554 | 4719 | 0 | 5273 | 0 |
| August 20, 2025 | 576 | 4169 | 0 | 4745 | 0 |
| September 19, 2025 | 470 | 3857 | 0 | 4327 | 0 |
| October 20, 2025 | 265 | 2433 | 0 | 2698 | 0 |
| November 18, 2025 | 165 | 1509 | 199 | 1873 | 0 |
| December 19, 2025 | 94 | 1047 | 100 | 1241 | 0 |
| January 21, 2026 | 80 | 1366 | 101 | 1547 | 0 |
| February 20, 2026 | 101 | 1133 | 111 | 1345 | 0 |
| March 20, 2026 | 211 | 1405 | 212 | 1828 | 0 |
| April 20, 2026 | 273 | 1971 | 241 | 2485 | 0 |
| May 22, 2026 | 285 | 2188 | 0 | 2473 | 0 |
| June 22, 2026 | 492 | 3776 | 0 | 4268 | 0 |
| July 22, 2026 | 503 | 3625 | 0 | 4128 | 0 |
| August 19, 2026 | 370 | 4132 | 0 | 4502 | 0 |
| September 21, 2026 | 310 | 4033 | 0 | 4343 | 0 |
| **Total** | **6,494** | **57,946** | **1,832** | **66,272** | **0** |

- onPeakKWh: 6,494 kWh (9.7990% of total usage).
- offPeakKWh: 57,946 kWh (87.4366% of total usage).
- superOffPeakKWh: 1,832 kWh (2.7644% of total usage).

The missing super-off-peak category previously understated the sum of categories
by 1,832 kWh. The billed usage total itself did not change.

Rounding validation uses half the last printed unit for each present category
and the printed total, summed as an absolute bound. Integer bills therefore
allow at most 2 kWh with three categories or 1.5 kWh with two; values printed to
two decimal places allow at most 0.02 kWh with three categories. Absent categories
contribute no rounding allowance. This is not a percentage tolerance. Missing,
nonfinite, negative or malformed usage fails reconciliation. Warnings include
bill date, all categories, total usage, signed difference and allowed tolerance.
No rounding allowance was needed for these 24 bills.

Legacy records without superOffPeakKWh normalize to zero; explicit parse failures
remain null and trigger warnings. Off-Peak parsing is anchored to the meter row,
preventing it from matching Super Off-Peak. Archive reprocessing reads PDFs in
place and writes history atomically; missing identity or conflicting duplicate
records abort before history is written.

The CSV importer already handles all three categories. Existing bill dashboard
readers display demand or bill costs, not category totals or percentages, so
those displays require no arithmetic change. The separate daily SavingsAnalyzer
now includes super-off-peak usage and costs in both plan totals and the resulting
savings percentage. Its existing default rates describe the summer comparison;
pricing nonzero super-off-peak usage requires explicitly supplied plan-specific
superOffPeakRate values, rather than silently omitting that energy. The current
API comparison covers July 22–August 15, 2026 and contains no super-off-peak usage.
CaptainsLog accepts the additional optional field for compatibility with older
savings responses.

Validation results:

- 8/8 tests passed: winter parsing, absent categories, decimals/commas/placeholders,
  malformed/missing values, legacy normalization, rounding bounds, savings costs
  and percentages, and full archive idempotence/data preservation.
- Targeted TypeScript check for all five changed TypeScript/TSX files passed
  using the repository compiler options and a temporary include-only config.
- ESLint passed for the importer, parser, regression tests and SavingsAnalyzer.
- `git diff --check` passed.
- Full `tsc --noEmit --incremental false` failed on existing unrelated errors:
  missing WaterGuru distribution modules, missing Jest test globals, an undefined
  WaterGuru `dashboard`, and JackeryClient's missing `testConnection` method.
- `npm run build` initially failed fetching Google Fonts under restricted network
  access. The authorized network-enabled retry compiled successfully, then failed
  TypeScript at `research/waterguru/waterguru-api-js/demo/server.ts:4` because
  `../../dist/index.js` is missing. The full production build did not pass.
- All six pre-existing modified files were verified byte-for-byte unchanged,
  including `scripts/google-calendar-test.ts`. No commits were created.

Files changed by this task:

- `scripts/aps-bill-import.ts`: archive replay, normalization, warnings, duplicate
  protection and atomic history write.
- `scripts/lib/aps-bill.ts` (new): extracted bill type/parser, three-category
  parsing, legacy normalization and precision-aware reconciliation.
- `scripts/aps-bill-import.test.ts` (new): regression and archive integration tests.
- `data/history/aps/bills.json`: superOffPeakKWh added to all 24 records.
- `app/lib/energy/SavingsAnalyzer.ts`: third-category usage/cost aggregation and
  configurable super-off-peak rates.
- `components/CaptainsLog.tsx`: backward-compatible savings response type.
- `docs/APS_BILL_RECONCILIATION.md` (new): this audit report.

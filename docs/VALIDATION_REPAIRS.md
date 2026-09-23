Repository validation repairs — September 22, 2026

Final results:

| Check | Before | After |
|---|---|---|
| Full TypeScript | 36 diagnostics | Pass, 0 errors |
| Full ESLint | 47 errors, 43 warnings | Pass, 0 errors / warnings |
| Root `npm test` | No test script | Pass |
| Existing app/importer tests | 19 passed via direct runner | 25 passed, including 6 new regression tests |
| WaterGuru research Jest | 1 passing suite, 2 failed suites | 1 passing suite, 8 tests passed |
| Production build | Font fetch failure; network retry failed at WaterGuru demo import | Pass, all 11 static pages generated |

Commands used for final validation:

- `npm run typecheck` (`tsc --noEmit --incremental false`)
- `npm run lint` (full workspace ESLint)
- `npm test` (all app/component/script *.test / *.spec suites plus the installed
  local WaterGuru Jest suite)
- `npm run build` with temporary network access for Google Fonts
- `git diff --check`

There are no remaining diagnostics or warnings in these final checks. Live
credentialed probes were not used as automated tests. Mocked connection tests do
not establish live Jackery or WaterGuru service availability.

Original causes and corrections:

| Failure or warning | Cause | Correction |
|---|---|---|
| WaterGuru demo TypeScript/build failure | `../../dist/index.js` resolved outside the package | Import the package's local source entrypoint |
| WaterGuru manual research probe | Wrong `./dist` path and an undeclared `dashboard` variable | Import source and await `api.getDashboard()` before printing it |
| Root WaterGuru probe | Importing an unexported package subpath and using a two-argument constructor instead of the actual options-object API | Reuse the app's WaterGuru client with `{ username, password }` |
| Research test TypeScript failures | Jest globals were only available through the nested test environment; protected/private methods were accessed through broad casts and ts-ignore | Explicit Jest imports; typed fixtures; typed prototype spies; a test subclass exposing protected methods; credential helper made protected |
| Research Jest suite failures | Discovery matched two manual `test.ts` probes with no test definitions, one starting asynchronous live authentication | Discover assertion-bearing `*.test.ts` suites; all probe files remain included in full TypeScript and ESLint validation |
| Research Jest warning | Deprecated ts-jest configuration under `globals` | Use the explicit transform configuration |
| Jackery missing method | `scripts/jackery-test.ts` called `testConnection`, but the client only contained ID helpers | Implement the encrypted login request from the existing local Python reference; narrow the JSON response; reject invalid credentials, HTTP failures, rejected responses and missing tokens |
| Jackery unused scaffold warnings | Stale imports/constants and unused helper/parameters | Remove unused imports/constants; expose the standalone UDID utility; document intentional no-op auth parameters without changing that scaffold's behavior |
| Four BHEM lint errors | Three `any` state types and an internal plain anchor | Use the CaptainsLog prop types, unknown for unused pool data, and Next Link |
| BHEM warning | Pool state was fetched but its value was never read | Omit the unused binding while retaining the request and state update |
| Lights API lint | Broad any for request bodies/results/errors | Type bodies from action state, use unknown results, narrow caught errors; regression-test offline and unknown failures |
| WaterGuru API lint | Measurement callback any because the dashboard return type was not declared | Use the existing dashboard schema and inferred measurement types; preserve comparison behavior by narrowing optional numeric measurements |
| CSV history writer lint | Broad record any | Use the primitive values supported by the existing CSV writer |
| WaterGuru client warnings | Two standalone property reads incorrectly looked like fallback expressions | Remove the no-op reads; preserve selection of `cognito:username` |
| Home page lint | Broad pool/HVAC any types and unused state/import/date bindings | Add precise view types, omit unused state values while retaining fetch/timer effects, remove unused calculations/imports |
| CaptainsLog lint | Unescaped apostrophe and unused destructured prop | Escape rendered apostrophe and leave the prop accepted but not destructured |
| SystemStatusBar effect error | Synchronous setMounted in an effect | Use useSyncExternalStore's server/client hydration snapshots; preserve the server clock placeholder and interval-driven updates; add a render regression test |
| Historical-store warning | Unused argument in an unfinished no-op function | Explicitly preserve/document its no-op behavior |
| Generated research declaration errors | Dashboard return values inferred as any | Regenerate declarations from the typed source |
| Generated JavaScript lint diagnostics | Minified expression statements and CommonJS compiler output under ESM-oriented rules | Rebuild readable output; keep all files in lint with a scoped rule configuration accepting exactly the three required dependency imports and esbuild's short-circuit export annotation |
| Research package export mismatch | CommonJS exports/main referenced .cjs files although the compiler emits .js | Point local package CommonJS exports/main to .js, module to .mjs |
| No root test command | package.json lacked a test script | Add test discovery/orchestration for all automated suites and a full typecheck script |
| Initial font-fetch build error | Restricted environment could not fetch Geist / Geist Mono from Google Fonts | Run production build with temporary network permission; retain existing fonts |

The existing Next.js guides were read before modifying application code. No files
were excluded from TypeScript or ESLint validation. No new broad any, ts-ignore,
or blanket eslint-disable comments were introduced. The generated CommonJS lint
configuration keeps both rules at error severity and allows only valid emitted
syntax; application rules are unchanged. The root tsconfig is unchanged.

Six new focused regression tests cover encrypted Jackery request payloads and
valid-token success, missing credentials without a network call, HTTP/login/
malformed-response rejection, light API request errors, unknown light errors and
unrecognized commands, and the status bar's server hydration placeholder. The
eight WaterGuru unit cases remain covered and also check session caching.

Files changed in the root repository:

| File | Change |
|---|---|
| `app/api/lights/route.ts` | Request/response/error types and error narrowing |
| `app/api/lights/route.test.ts` (new) | Two offline/error handling tests |
| `app/api/waterguru/route.ts` | Inferred measurement types and optional-value narrowing |
| `app/bhem/page.tsx` | Typed state, preserved unused pool fetch, Next Link |
| `app/lib/history/writer.ts` | CSV primitive record type |
| `app/lib/jackery/auth.ts` | Remove unused scaffold material; preserve placeholder behavior |
| `app/lib/jackery/client.ts` | Implement the missing connection method with typed validation |
| `app/lib/jackery/client.test.ts` (new) | Three mocked connection tests |
| `app/lib/waterguru/client.ts` | Dashboard return type and removal of no-op reads |
| `app/page.tsx` | Precise view types and unused binding cleanup |
| `components/CaptainsLog.tsx` | Apostrophe escaping and unused destructuring cleanup |
| `components/SystemStatusBar.tsx` | Hydration snapshot instead of synchronous effect state |
| `components/SystemStatusBar.test.tsx` (new) | Hydration placeholder regression test |
| `eslint.config.mjs` | Narrow CommonJS compiler-output syntax allowances; no additional ignores |
| `package.json` | Full test and typecheck commands |
| `scripts/historical-store.ts` | Document/preserve the intentionally unused no-op argument |
| `scripts/run-tests.mjs` (new) | Automated test discovery and local research test orchestration |
| `scripts/waterguru-test.ts` | Correct client import and constructor |
| `docs/VALIDATION_REPAIRS.md` (new) | This report |

Additional files changed in the existing Git-ignored nested checkout,
`research/waterguru/waterguru-api-js/` (these do not appear in root git status):

- `demo/server.ts`: correct source import.
- `jest.config.js`: explicit transform and automated test discovery.
- `package.json`: correct emitted module paths.
- `src/client.ts`: precise dashboard return type, protected credential helper,
  remove no-op property reads.
- `tests/client.test.ts`: typed mocks/fixtures and explicit Jest imports.
- `tests/test.ts`: correct source import and fetch the dashboard before printing.
- `tsup.config.ts`: readable output and non-cleaning rebuild to retain local artifacts.

Regenerated compiler outputs in that checkout (including source maps and
unchanged-content type-only artifacts rewritten by the compiler):

- `research/waterguru/waterguru-api-js/dist/client.d.mts`
- `research/waterguru/waterguru-api-js/dist/client.d.ts`
- `research/waterguru/waterguru-api-js/dist/client.js`
- `research/waterguru/waterguru-api-js/dist/client.js.map`
- `research/waterguru/waterguru-api-js/dist/client.mjs`
- `research/waterguru/waterguru-api-js/dist/client.mjs.map`
- `research/waterguru/waterguru-api-js/dist/index.d.mts`
- `research/waterguru/waterguru-api-js/dist/index.d.ts`
- `research/waterguru/waterguru-api-js/dist/index.js`
- `research/waterguru/waterguru-api-js/dist/index.js.map`
- `research/waterguru/waterguru-api-js/dist/index.mjs`
- `research/waterguru/waterguru-api-js/dist/index.mjs.map`
- `research/waterguru/waterguru-api-js/dist/types.d.mts`
- `research/waterguru/waterguru-api-js/dist/types.d.ts`
- `research/waterguru/waterguru-api-js/dist/types.js`
- `research/waterguru/waterguru-api-js/dist/types.js.map`
- `research/waterguru/waterguru-api-js/dist/types.mjs`
- `research/waterguru/waterguru-api-js/dist/types.mjs.map`

The baseline Jest run generated a coverage report; it was preserved at
`/tmp/repo-validation/research-coverage-baseline` rather than leaving generated
report JavaScript mixed into workspace lint inputs. Jest no longer implicitly
creates coverage reports during ordinary tests. Other check logs are under
`/tmp/repo-validation/`.

Preservation checks:

- `data/energy.json`
- `data/ops/calendar.json`
- `data/ops/countermeasure-performance.json`
- `data/ops/daily-performance.json`
- `data/ops/savings.json`
- `scripts/google-calendar-test.ts`

All six match their initial SHA-256 hashes byte-for-byte. No edit was made to the
calendar script. Existing nested-checkout .gitignore and package-lock changes
were left alone. No restore, reset, checkout, clean, or commit commands were used.

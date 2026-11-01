# Stream wt/1-safety report (weather-app cards 1-5)

## Changes per card
- [1] `page.js`: `<a>` replaced with `next/link` Link. Lint now exits 0.
- [2] `openweather.js`: `OpenWeatherError` (status, code), `requireApiKey()` throws code "config" before fetching; messages carry no URL or key. New `error.js` (client, reset button). `package.json` gains `"test": "node --test"`. `openweather.test.js` covers 401/429/500 (both calls), 404 null, missing key.
- [3] `owFetch` helper: `signal: AbortSignal.timeout(5000)`, `next.revalidate` 86400 (geocode) and 900 (forecast). TimeoutError/AbortError map to OpenWeatherError code "timeout"; other fetch rejections to "network". Tests assert the options and mapping.
- [4] `loading.js` skeleton; home form uses `useTransition`, button disabled with "Loading..."; every page branch (invalid, not found, upstream error, forecast) has a next/link back to `/`.
- [5] Heading is now "Forecast for ..." (no "5-Day" claim); days with fewer than 8 slots get " (partial day)" via new `isPartialDay`. Tests for groupForecastByDay (negative offset, midnight crossing, 6 buckets), formatSlotTime, formatDayHeading.

## Results
- Before: `npm run lint` exit 1 (1 error, page.js:21). `npm run build` fails offline: next/font cannot fetch Geist from fonts.googleapis.com (sandbox network denied); build is not runnable here.
- After: `npm run lint` exit 0; `npm test` 17/17 pass. Build not re-run (same network block); not verified.
- `npm ci --ignore-scripts` was run (node_modules was missing); it worked.

## Deferred / judgment notes
- Card 2 asked for distinct 429 vs 401/config copy inside `error.js`. Next strips server-error messages in production (only a digest reaches the client), so `error.js` cannot tell them apart. Distinct copy ("Service busy" vs "Forecast unavailable") is rendered by a try/catch in `page.js`; `error.js` is a generic fallback with retry. Needs owner awareness.
- Card 4: no component test (no DOM test runner; adding one needs dev deps). Manual check: submit a valid zip on `/`, button shows "Loading..." and is disabled until the page renders.
- Home page h1 still says "5-Day Weather Forecast" (out of card scope).
- Cache windows 86400/900 used per card default (open question Q6).
- Build acceptance criteria for cards 2-4 are unverified because build needs network.

## Surprises
- Rate-limit and timeout copy never exercised against real API (no network by constraint).

## Fix pass (review F1-F8)
- F1: `export const dynamic = "force-dynamic"` on the weather page so failure renders are not route-cached. Fetch-level `next.revalidate` is kept (per-response non-2xx exclusion is not possible with the fetch options API); whether Next Data Cache stores a non-2xx upstream response (e.g. 429 for 24h on geocode) is UNVERIFIED without a build/run. Unverified end to end (no build possible offline).
- F2: `error.js` has a Link to `/`; retry runs `router.refresh()` + `reset()` inside `startTransition`.
- F3: `res.json()` and shape checks (coords; `list` array and numeric `city.timezone`) are wrapped; body timeout -> code "timeout", bad JSON/missing fields -> code "bad_response". Tests added.
- F4: tests for 7 vs 8 slot boundary, "network" code (no key/URL, no cause), bad_response, body timeout. page.js cannot be loaded by node:test (alias, CSS module, JSX), so its copy logic moved to the testable `describeUpstreamError` in the lib; page rendering itself remains untested. DST: DEFERRED -- `city.timezone` is a single fixed offset; per-slot offsets would need a timezone database lookup (not available from the payload). Documented as a known limitation in `openweather.js`.
- F5: home h1 and layout metadata title now "Weather Forecast", matching the results heading. README still says "5-Day" in its title/description and is unchanged (wording intent unclear; owner may want README aligned).
- F6: documented in `openweather.js` (key is part of the Data Cache key; do not enable `logging.fetches.fullUrl`). No code change.
- F7: `role="status"` live region announces loading; error `<p>` has `role="alert"`, input has `aria-invalid`/`aria-describedby`; button uses `aria-disabled` (keeps focus) with a submit guard instead of `disabled`.
- F8: `src/app/global-error.js` added.

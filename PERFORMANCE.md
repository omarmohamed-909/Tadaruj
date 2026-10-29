# Performance verification

## Scope and method

The October 29, 2026 performance pass compares the production build at
`c8b22118f8f364f4189552855526f829466d2c09` with the slow-connection improvements.
These are browser lab measurements, not measurements from physical phones or
real-user traffic. Connection quality, device speed, API cold starts, and video
hosting can change the results substantially.

Public pages are audited with Lighthouse 13.6.0, Chromium 156.0.8078.4, and a fresh profile for
every navigation. Home is measured three times for each viewport; catalog and
login are measured twice each. Report the median, rather than the best run.
The before and after runs use the same configuration, with no local builds or
test suites running during an audit:

```json
{
  "throttlingMethod": "simulate",
  "throttling": {
    "rttMs": 150,
    "throughputKbps": 1638.4,
    "requestLatencyMs": 562.5,
    "downloadThroughputKbps": 1474.56,
    "uploadThroughputKbps": 675,
    "cpuSlowdownMultiplier": 4
  },
  "screenEmulation": {
    "mobile": true,
    "width": 390,
    "height": 844,
    "deviceScaleFactor": 2
  }
}
```

Desktop uses 1365 × 900, DPR 1, and CPU multiplier 1, retaining the same weak
network settings. Save Lighthouse HTML/JSON reports outside version control.
Use a clean browser profile without extensions or a signed-in session. Repeat
home, `/courses`, and `/login?mode=login`; compare LCP, TBT, CLS, transferred
bytes, and the number of profile checks. A Lighthouse score alone is not a
release acceptance criterion.

## Implemented changes

- Public pages render while the session is checked. Private routes still wait
  for server validation. A temporary connection failure offers retry; a 401 or
  403 still rejects the session.
- Startup has one session-query subscription instead of a second imperative
  request with a different cache key. Changing identity can legitimately cause
  another validation and clears private query caches.
- Mobile menus, desktop account menus, and notifications load only when needed.
  Mobile menu keyboard focus, Escape, navigation, and Arabic layout are covered
  by browser tests. Background notification polling pauses when unfocused.
- Instructor avatars and footer artwork wait until near the viewport. Header
  logos reserve their aspect ratio; critical heading content is not deferred.
- Course pages load the video engine only when rendering a video. Native video
  uses `preload="none"`; playback and saved completion are tested after an
  explicit play action. External providers can still load their own UI/scripts.
- Route loading keeps the header available. The main region reserves at least
  the viewport below the header, keeping the footer below the initial screen
  while authentication or route data is pending.
- Google sign-in reserves its button height while the external SDK loads.

## Build budget

| Initial JavaScript | Before | After |
| --- | ---: | ---: |
| Uncompressed | 614,951 bytes | 484,303 bytes |
| Gzip | 196,994 bytes | 155,541 bytes |

Startup JavaScript is about **21% smaller**. `npm run check:bundle --prefix
client` now fails above 500,000 raw bytes or 165,000 gzip bytes across all static
entry dependencies. Optional route and video chunks are excluded from this
startup budget and still need route-specific review.

## Published-site results

The optimized code was verified on the production aliases at commit
`bbaeea38d6d371b21f53d1872e8d7507f0550769`. Each table value is the median
across the runs described above: 10 before and 10 after in total.
The published catalog was empty at audit time. Populated catalog and private
routes are checked separately with 26 published fixture courses; the public
catalog score should not be extrapolated to a large real catalog.

| Page / viewport | LCP before | LCP after | Score before | Score after |
| --- | ---: | ---: | ---: | ---: |
| Home / mobile | 2.96 s | 0.98 s | 92 | 100 |
| Home / desktop | 2.83 s | 0.97 s | 78 | 96 |
| Catalog / mobile | 2.91 s | 1.05 s | 93.5 | 100 |
| Login / mobile | 2.92 s | 1.06 s | 92.5 | 98.5 |

Mobile home transferred 409,396 → 243,169 bytes during the audit, about **41%
less**, and median TBT decreased from 176 → 75 ms. Home and catalog CLS remained
zero; login CLS decreased from 0.0615 → 0.0022. Anonymous profile requests
decreased from two to one in every matched audit.

These scores are specific to this lab configuration. Login still loads Google's
external SDK and fonts; its median TBT was 122 → 128.5 ms, so this pass does not
claim a main-thread improvement for that page. The first home run in each batch
had a much longer speed index than subsequent runs; this is why repeated medians
and individual raw reports matter.

## Controlled route checks

An additional browser pass uses gzip-compressed production builds and a fresh
isolated MongoDB fixture. It covers home, catalog, login, course detail, lesson
playback, instructor dashboard, and admin users on a 390 × 844 viewport, plus
desktop home. External services and real messages/payments are disabled.

The normal emulation uses 1.6 Mbps download, 750 Kbps upload, 150 ms latency, and
4× CPU slowdown on mobile. A separate severe case uses 400 Kbps, 400 ms latency,
and 6× CPU slowdown. These checks are distinct from Lighthouse's simulated model.

In one matched severe-network home navigation, LCP decreased from 8.43 s to
6.52 s. This single fixture pair is a diagnostic sample, not a population
estimate. The lesson fixture downloaded no video bytes before play, compared
with 7,476 bytes of its synthetic two-second video before the change. It does
not predict savings for a real full-length lesson or every external provider.

Private route latency varies with API requests, charts, and the player engine;
this pass does not claim that every private route's LCP improved. Further
improvements should be justified by repeated measurements with representative
course/user data.

## Regression checks

```sh
npm test --prefix client
npm run lint --prefix client
npm run build --prefix client
npm run check:bundle --prefix client
npm run test:e2e --prefix client
```

The browser harness requires the isolated MongoDB replica set described in
[TESTING.md](TESTING.md). Its slow-connection journeys hold the profile request
open while browsing, exercise menu focus and RTL, retry a temporary failure
without trusting a cached admin identity, and complete login while an older
anonymous session request is delayed. No production accounts are modified.

References: [Lighthouse](https://developer.chrome.com/docs/devtools/lighthouse/),
[LCP optimization](https://web.dev/articles/optimize-lcp).

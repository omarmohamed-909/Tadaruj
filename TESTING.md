# Testing Tadaruj

Use Node.js **22.12 or later** and install both projects from the repository root:

```sh
npm ci --prefix client
npm ci --prefix server
```

## Fast checks

```sh
npm test --prefix client
npm test --prefix server
npm run lint --prefix client
npm run build --prefix client
npm run check:bundle --prefix client
```

The plain backend test command skips real database suites when their test URIs are absent. Use the strict commands below to require those suites.

## Isolated MongoDB integration tests

Tests require a replica set named `codex-test` at `127.0.0.1:27028`. Never point them at a platform database. The strict runner does not load `.env` or use `MONGO_URI`: it generates three separate, fresh database names and checks the replica-set identity before starting Vitest. Integration suites also refuse populated databases.

GitHub Actions starts an ephemeral `mongo:8.0` container using [.github/scripts/start-test-mongo.sh](.github/scripts/start-test-mongo.sh). On a local machine with Docker, run:

```sh
docker run --detach --name tadaruj-test-mongo --publish 127.0.0.1:27028:27028 mongo:8.0 --port 27028 --replSet codex-test --bind_ip_all
docker exec tadaruj-test-mongo mongosh --quiet --port 27028 --eval 'rs.initiate({_id:"codex-test",members:[{_id:0,host:"127.0.0.1:27028"}]})'
```

Wait until `db.hello().isWritablePrimary` returns true in `mongosh`, then run:

```sh
npm run test:integration --prefix server
npm run test:ci --prefix server
```

`test:integration` runs the database suites; `test:ci` runs the complete backend suite with real MongoDB. Databases remain in the disposable test instance for investigation. These commands do not delete existing databases or reuse the application's connection string.

## Browser journeys

With that isolated replica set running, install Chromium once and run Playwright:

```sh
cd client
npx playwright install chromium
npm run test:e2e
```

On Linux CI, browser installation uses `npx playwright install --with-deps chromium`. The harness starts its own API on `127.0.0.1:8093`, synthetic media server on port `8094`, and frontend on port `5193`. Those ports must be free; existing application servers are not reused.

Each run creates a new test database, a synthetic instructor, and 26 published courses. The browser registers and verifies a new student, checks that protected media is denied before approval, creates a WhatsApp order, confirms it from a separate instructor session, plays a generated two-second video, and checks persisted completion after reload. Catalog, search, instructor pagination, browser history, and a narrow mobile viewport are covered too.

Email delivery, Google, Cloudinary, and Stripe are disabled in this harness. Non-loopback browser traffic is blocked. The WhatsApp popup is fulfilled locally; no real message or payment is sent. The verification shortcut is available only in the local development test UI. Real external providers, email delivery, and deployed-origin configuration need their own deployment checks.

Failure traces, screenshots, and recordings are written to ignored `client/test-results/`. CI also uploads the HTML report and results for seven days. Open a trace with:

```sh
cd client
npx playwright show-trace test-results/<failed-test>/trace.zip
```

Fixtures and generated media live in ignored `.test-runtime/`. They contain synthetic local test credentials only and must not be deployed.

## Public catalog contract

- `GET /api/v1/course/published-courses`, course search, and public instructor detail accept `page` and `limit`.
- Defaults are page 1 and 12 items. The limit is capped at 24. Invalid values return 400; a page beyond the result set is clamped to the last available page.
- Responses include `courses`, `page`, `limit`, `total`, and `totalPages`. Lists project public card fields and omit private lecture content and enrollment lists.
- Stable secondary `_id` sorting prevents overlapping pages when primary sort values match.
- `GET /api/v1/course/filters` returns whole-catalog subject and stage options, including supported legacy categories, without downloading every course.
- Page and filter state lives in the URL. Changing filters resets page 1; reload and browser history restore the selection.

## CI and limits

The frontend, real-database backend, and browser jobs run independently on pushes and pull requests, without service secrets. A successful run verifies these local contracts and journeys, not production readiness or external service delivery. On-demand video engines still produce a build size warning.

References: [Playwright CI](https://playwright.dev/docs/ci), [Playwright test isolation](https://playwright.dev/docs/browser-contexts), [MongoDB test replica sets](https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set-for-testing/).

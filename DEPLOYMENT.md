# Deploying Tadaruj

The repository now includes health probes, graceful container shutdown, a production configuration gate, and CI checks for the API container and a synthetic database recovery drill. These prepare the application for hosting; they do not provision a domain, database, email sender, or monitoring account.

## Choose the two deployment roots

Deploy `client/` as a Vite frontend and `server/` as the API. The existing Vercel configurations support separate projects. The API also has a Dockerfile for a long-running service. Use a dedicated MongoDB replica set or Atlas deployment: instructor payment approval requires transactions.

The frontend build commands are `npm ci` and `npm run build`; publish `dist/`. The API installs with `npm ci --omit=dev` and starts with `node index.js`. The Docker image uses Node 22 and runs as the unprivileged `node` user. Set the service port to `8080`, or supply `PORT`.

Vercel imports the API's default Express export without starting an extra listener. Signal handling and the Docker health check apply to long-running processes; Vercel manages its own function lifecycle. Keep the `server/` project root and its `vercel.json` together.

## Configure the production environment

Set these values through the hosting provider's private environment settings:

| Variable | Production value |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONGO_URI` | Dedicated database with replica-set/transaction support |
| `SECRET_KEY` | A unique random signing secret of at least 32 characters |
| `FRONTEND_URL` | The exact public HTTPS frontend origin |
| `FRONTEND_URLS` | Only additional exact allowed HTTPS origins; remove local development origins |
| `TRUST_PROXY_HOPS` | The hosting provider's actual number of trusted proxy hops; default `0` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | The platform's media account credentials |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Sending key and an address on your verified platform domain |
| `RESEND_REPLY_TO` | Optional support mailbox |
| `EMAIL_DELIVERY_ENABLED` | `true` |
| `ALLOW_DEV_RESET_LINKS`, `ALLOW_DEV_VERIFICATION_LINKS` | `false` |
| `GOOGLE_CLIENT_ID` | Optional public web client ID; register the exact production origin in Google Cloud |

Set `VITE_API_BASE_URL` in the **frontend build environment** to the public HTTPS API origin, without `/api/v1`. Redeploy the frontend after changing it. Never put private credentials in `VITE_*` values. For separate origins, test sign-in and reload in the target browser: the frontend sends its persisted bearer token alongside credentials.

The example environment contains localhost origins and an unusable signing-key placeholder. Do not deploy it unchanged. The API refuses to start in production when required configuration is missing, local verification shortcuts are enabled, origins are malformed, or proxy hops are invalid.

## Run the release checks

From a trusted checkout with the intended backend environment available:

```sh
npm run check:production --prefix server
```

This forces production rules and performs read-only database/Cloudinary checks. It does **not** send email. A configured sender does not prove domain verification or delivery. Verify the domain in the platform's own Resend account, send an explicitly authorized test using [EMAIL_SETUP.md](EMAIL_SETUP.md), and inspect its delivery status. Google configuration likewise needs the real deployed origin.

Use [TESTING.md](TESTING.md) for automated checks. CI runs without production credentials; its MongoDB 7 test instance does not select or upgrade your hosted database version.

## Health and shutdown

| Endpoint | Meaning | Expected status |
| --- | --- | --- |
| `GET /health/live` | The HTTP process can answer; independent of MongoDB | `200` |
| `GET /health/ready` | Database responds and supports writable replica-set/sharded operation; instance is not draining | `200`, otherwise `503` |

Both endpoints use `Cache-Control: no-store` and return only a small status object. Readiness is bounded to 1.5 seconds and reveals no connection strings or service credentials. Configure the load balancer to route traffic only to ready instances. The Docker health check tests liveness; database failure alone should not cause a process restart loop.

On `SIGTERM` or `SIGINT`, long-running servers mark themselves unavailable, stop accepting connections, wait for active HTTP work, disconnect MongoDB, and exit. The shutdown deadline is 10 seconds; configure the host's termination grace period above that deadline. Requests still running at the deadline are terminated, so keep large media uploads on the existing direct Cloudinary path.

## Logs and monitoring

New request logs use JSON with timestamp, level, server-generated request ID, method, route template, status, and duration. The HTTP error wrapper does not log request bodies, actual token paths, queries, cookies, authorization headers, or exception messages. The same request ID is returned in `X-Request-Id` and central error responses. Existing controller/provider logs have not all been migrated to this logger; keep hosting logs private.

Once the service exists, configure your chosen monitoring service to check readiness, report repeated failures and elevated 5xx rates, and monitor process restarts. Use the request ID to investigate reports. No monitoring account, paid plan, or scheduled task is created by this repository.

## First release and rollback

1. Take and verify a database backup using [RECOVERY.md](RECOVERY.md). Record the commit, deployment ID, configuration version, and backup time privately.
2. Deploy the API, check both health endpoints, then deploy the frontend with its API origin.
3. Verify the first admin, signup, real email verification, password recovery, and Google sign-in if enabled.
4. With test participants, check instructor ownership, WhatsApp details, payment approval, protected lesson access, video progress after reload, Arabic, and mobile layout.
5. If release behavior fails, promote the previous known-good deployment and restore its compatible configuration. Do not restore a database automatically for a code rollback: a database restore can discard newer activity. Assess data changes and the recovery point first.

The release still needs a public domain, verified sender, hosting configuration, actual provider delivery checks, and an off-site backup policy. Large video engines continue to produce deferred bundle warnings.

References: [Express health checks and shutdown](https://expressjs.com/en/advanced/healthcheck-graceful-shutdown/), [Express on Vercel](https://vercel.com/docs/frameworks/backend/express).

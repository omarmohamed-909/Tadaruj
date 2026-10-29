<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="client/public/tadaruj-logo-dark.webp">
  <source media="(prefers-color-scheme: light)" srcset="client/public/tadaruj-logo.webp">
  <img src="client/public/tadaruj-logo.webp" alt="Tadaruj" width="210">
</picture>

# Tadaruj

**Every subject has a starting point. Every step counts.**

A learning platform connecting students and instructors across subjects and stages.<br>
Find your instructor, choose your course, and learn in Arabic or English.

**React 19 · Express 5 · MongoDB · Tailwind CSS 4**

[Live demo](https://tadaruj-phi.vercel.app) · [Features](#features) · [Quick start](#quick-start) · [Configuration](#configuration) · [Testing](#checks) · [Documentation](#documentation)

</div>

---

<a id="overview"></a>
## Overview

Tadaruj puts instructors and students at the center of the learning experience. The homepage introduces the platform's instructors, and each instructor has a public profile showcasing their published courses. A dedicated catalog supports course search and filtering across subjects, including languages, sciences, technology, and humanities.

This repository contains both the frontend and backend, with separate development and deployment configurations for each.

<a id="features"></a>
## Features

| Area | Capabilities |
| --- | --- |
| Discovery | Instructor cards, public profiles, and courses searchable by subject, stage, and price |
| Learning | Video lessons, attachments, quizzes, comments, and saved student progress |
| Accounts | Email and password registration, Google sign-in, email verification, and password recovery |
| Content management | Instructor tools for courses, lessons, quizzes, and enrollment requests |
| Platform management | Administration for accounts, content, and orders, with admin invitations and an audit log |
| Interface | Arabic and English, RTL/LTR layouts, light and dark themes, and responsive pages |
| Integrations | Resend for email, Cloudinary for media, and WhatsApp for enrollment communication |

### Roles and permissions

| Role | Responsibilities |
| --- | --- |
| **Student** | Discover instructors and courses, request enrollment, access available content, and track progress |
| **Instructor** | Manage their own content and enrollment requests, and confirm payments they have received |
| **Admin** | Oversee accounts, content, orders, and audit activity; payment receipt confirmation remains with the instructor who owns the order |

### Enrollment and payments

1. A student selects a paid course and creates an enrollment request.
2. The student opens a WhatsApp conversation with the instructor, including the course details and order reference.
3. The student and instructor agree on a payment method. Each instructor receives their own payments directly.
4. After checking that the payment has arrived, the instructor confirms the order in their dashboard and the student receives course access.

**Creating a request or opening WhatsApp does not grant access automatically.** Instructors must add a WhatsApp number before publishing a paid course. The remaining Stripe integration supports verification of legacy transactions; new enrollment requests follow the flow above.

<a id="stack"></a>
## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React 19, Vite 7, React Router 7, Redux Toolkit / RTK Query |
| UI | Tailwind CSS 4, Radix UI, Lucide |
| Backend | Node.js, Express 5, Mongoose 8 |
| Database | MongoDB with a replica set for enrollment confirmation transactions |
| Authentication and email | Google Identity Services, JWT, Resend |
| Media | Cloudinary with signed, time-limited access URLs |
| Quality checks | Vitest, React Testing Library, ESLint, GitHub Actions |

<a id="quick-start"></a>
## Quick start

### 1. Prerequisites

- **Node.js 22.12 or later** and npm. The current CI configuration uses Node.js 22.
- Git and access to this repository.
- A local or hosted MongoDB instance with a **replica set** to support enrollment confirmation transactions.
- Credentials for the integrations you want to use: Resend for email, Cloudinary for media, and Google for sign-in.

### 2. Clone and install

```sh
git clone https://github.com/omarmohamed-909/Tadaruj.git
cd Tadaruj

npm ci --prefix server
npm ci --prefix client
```

Create your environment files from the provided examples. In **PowerShell**:

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env.local
```

<details>
<summary>macOS or Linux</summary>

```sh
cp server/.env.example server/.env
cp client/.env.example client/.env.local
```

</details>

Fill in your environment values before starting. The example files do not connect a database or configure real service accounts on their own.

### 3. Start the application

In one terminal, from the repository root:

```sh
npm run dev --prefix server
```

In a second terminal, also from the repository root:

```sh
npm run dev --prefix client
```

| Service | Address with the example configuration |
| --- | --- |
| Frontend | [localhost:5173](http://localhost:5173) |
| Backend | `http://localhost:8080` |
| API routes | `http://localhost:8080/api/v1` |

If Vite selects another port, use the address shown in the terminal and update the backend and Google origin settings as needed. Restart Vite after changing frontend environment variables.

<a id="configuration"></a>
## Configuration

### Frontend — `client/.env.local`

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Backend address **without** `/api/v1`, such as `http://localhost:8080` |

When this variable is unset, the frontend uses `http://localhost:8080` on localhost and same-origin API routes in a deployed environment.

### Backend — `server/.env`

| Group | Variables | Purpose |
| --- | --- | --- |
| Runtime | `PORT`, `MONGO_URI`, `SECRET_KEY` | Backend port, a dedicated database, and a long random session signing key |
| Frontend origins | `FRONTEND_URL`, `FRONTEND_URLS` | Primary frontend origin for email links and additional allowed origins, separated by commas |
| Google | `GOOGLE_CLIENT_ID` | Web client ID; register the same frontend origins in Google Cloud |
| Media | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary credentials for uploads and media access |
| Email | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Resend sending key and sender identity |
| Email options | `RESEND_REPLY_TO`, `EMAIL_DELIVERY_ENABLED`, `RESEND_TEST_RECIPIENT` | Reply address, email delivery switch, and permitted test recipient |
| Reverse proxy | `TRUST_PROXY_HOPS` | Number of trusted proxy hops for your hosting setup; defaults to `0` |

- **Google:** This implementation needs a Client ID only. It does not require a Client Secret or Gmail/Drive permissions. See the [Google setup guide](GOOGLE_AUTH_SETUP.md).
- **Resend:** Sending to users generally requires a verified domain. The `resend.dev` test sender is limited to the Resend account owner's address and is blocked by the application in production. See the [email setup guide](EMAIL_SETUP.md).
- **Secrets:** Real environment files are excluded from Git. Every `VITE_*` value is exposed to the browser; keep private credentials on the backend.
- Keep the development-only link options `ALLOW_DEV_VERIFICATION_LINKS` and `ALLOW_DEV_RESET_LINKS` set to `false` during normal use.

See the [backend environment example](server/.env.example) and [frontend environment example](client/.env.example) for all available settings.

<a id="administration"></a>
## Create the first admin

There are no default admin accounts or passwords. First, register a regular account and verify its email. Then run the following from the repository root in **PowerShell**, inside a trusted backend environment:

```powershell
$env:BOOTSTRAP_ADMIN_EMAIL="your-admin@example.com"
$env:BOOTSTRAP_ADMIN_SECRET=[guid]::NewGuid().ToString("N")
npm run bootstrap:admin --prefix server

Remove-Item Env:BOOTSTRAP_ADMIN_EMAIL
Remove-Item Env:BOOTSTRAP_ADMIN_SECRET
```

The script promotes only the specified account, records an audit entry, and refuses to run if an admin already exists. Use invitations from the admin dashboard to add further administrators.

<a id="checks"></a>
## Testing and validation

Run these commands from the repository root:

```sh
npm test --prefix server
npm test --prefix client
npm run lint --prefix client
npm run build --prefix client
npm run check:bundle --prefix client
```

[GitHub Actions](https://github.com/omarmohamed-909/Tadaruj/actions/workflows/ci.yml) runs frontend checks, the full backend suite against an isolated MongoDB replica set, and Chromium browser journeys on pushes and pull requests. Browser tests cover registration, verification, manual enrollment approval, video completion, direct file uploads, catalog pagination, and admin user search with Arabic/mobile checks. The backend job also verifies the API container and restores a synthetic database backup into a separate empty database.

The plain backend test command skips database suites without test URIs. Use `npm run test:ci --prefix server` to require them, or `npm run test:e2e --prefix client` for browser tests. See [TESTING.md](TESTING.md) for the isolated database setup, browser installation, test boundaries, and failure artifacts.

### Check service configuration

```sh
npm run check:setup --prefix server
npm run check:setup --prefix server -- --services
npm run check:production --prefix server
```

These checks do not send email. To send a real test message to an address you own that is allowed by your Resend configuration:

```sh
npm run email:test --prefix server -- --to your-owned-email@example.com
```

Acceptance by Resend does not confirm delivery. Review the delivery status in the Resend dashboard.

<a id="structure"></a>
## Project structure

```text
Tadaruj/
├── client/
│   ├── public/              # Brand assets and public files
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── features/        # Application state and API integration
│   │   ├── pages/           # Platform pages
│   │   └── lib/             # Shared frontend utilities
│   └── .env.example
├── server/
│   ├── controllers/         # API request logic
│   ├── middlewares/         # Authentication and authorization
│   ├── models/              # MongoDB models
│   ├── routes/              # API routes
│   ├── scripts/             # Setup checks, administration, and testing
│   ├── utils/               # Email, media, and shared utilities
│   └── .env.example
├── .github/workflows/       # Automated checks
├── EMAIL_SETUP.md
├── GOOGLE_AUTH_SETUP.md
├── TESTING.md
└── TEST_REPORT.md
```

<a id="deployment"></a>
## Build and deployment

The frontend and backend can be deployed independently. The repository includes Vercel configurations for both and a Dockerfile for the backend.

1. Build the frontend with `npm run build --prefix client`. The output is written to `client/dist`.
2. Set `VITE_API_BASE_URL` to the deployed backend address before building the frontend. Start the backend with `npm start --prefix server`.
3. Configure `NODE_ENV=production`, the database connection, and secrets in the backend hosting environment.
4. Update `FRONTEND_URL` and `FRONTEND_URLS`, register the deployed frontend origin with Google, and verify your email domain in Resend.
5. Follow the [deployment guide](DEPLOYMENT.md), verify [backup recovery](RECOVERY.md), and test registration, verification, sign-in, enrollment, and content access in the deployed environment.

Passing CI does not validate external service credentials or domain configuration. Some video engines loaded on demand still produce bundle-size warnings during the build; account for these when reviewing deployment performance.

<a id="documentation"></a>
## Documentation

The testing guide is in English; service setup guides include Arabic instructions.

| Guide | Contents |
| --- | --- |
| [Frontend setup](client/README.md) | API configuration and frontend development commands |
| [Email setup](EMAIL_SETUP.md) | Resend, the test sender, domain configuration, and sending checks |
| [Google sign-in](GOOGLE_AUTH_SETUP.md) | Google client configuration and account linking behavior |
| [Test report](TEST_REPORT.md) | Recorded results, test coverage areas, and verification limits |
| [Testing guide](TESTING.md) | Isolated MongoDB, Playwright journeys, CI, and pagination contracts |
| [Performance verification](PERFORMANCE.md) | Weak-network measurements, startup budgets, deferred downloads, and mobile regression checks |
| [Deployment guide](DEPLOYMENT.md) | Production configuration, probes, Docker, monitoring, and rollback |
| [Recovery guide](RECOVERY.md) | Consistent backups, isolated restores, media dependencies, and CI recovery drill |

---

<div align="center">

**Tadaruj**<br>
Learn at your own pace. Move forward every day.

</div>

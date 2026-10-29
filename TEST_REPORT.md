# سجل التحقق — تدرّج

## Paginated course access dialog — 29 October 2026

- Added the admin-only `GET /api/v1/course/admin/course-access` endpoint with a required target user, 12 courses per page by default and a hard maximum of 24. Escaped title/instructor-name search, publication and direct-access filters, global grant counts, stable grant-first ordering, and page clamping execute on the server. Responses include only the course identity/title/status, instructor identity/name, and the selected user's direct-access flag.
- Extracted a dedicated dialog with independent search/filter/page state, retryable errors, loading controls, translated labels, and internal scrolling for mobile. The user's list snapshot no longer determines a course's access button. Grant/revoke completion refreshes every cached course-access page for that target user, including after an error that might follow a partial server update. Other users' caches stay separate. Course creation/editing/deletion/publication invalidates affected catalog views.
- The existing catalog endpoint remains available to dashboard, course-management, and quiz screens; a regression test verifies that those consumers still receive their expected complete catalog. Their separate pagination/aggregation work is outside this change.
- Local validation: **358 backend tests**, **139 frontend tests**, and **six Chromium journeys passed**. Added real MongoDB/HTTP checks for typed filters, privacy, instructor-name search, stable pagination, cross-user isolation, grant/revoke refresh, empty-page recovery, the paid-purchase revoke restriction, and the legacy catalog contract. Browser checks exercised pagination, both access filters, actual grant/revoke, instructor-name search, draft filtering, and Arabic mobile layout. Reviewed desktop and mobile dialog screenshots. Lint, build and startup budget passed; existing deferred video-engine warnings remain.

## Admin user search and pagination — 29 October 2026

- Admin user listing now returns 20 users by default, with a hard maximum of 50. Name/email/role search and role/status filtering execute on the server. Typed filter validation, escaped regex text, stable creation-time/ID ordering, and a matching-user total keep navigation predictable. Obsolete pages clamp to the last available page; empty results use page one. Legacy accounts without a stored status remain included in the active filter.
- The interface preserves search, role, status, and page in the URL, supports history/reload and clearing filters, and loads the course-access catalog only when its dialog opens. Mutation tag invalidation refreshes every affected user-page cache; the old optimistic updates tied to a single unparameterized cache were removed. At that stage the dialog still loaded a complete catalog; the follow-up above replaces that flow.
- Added an isolated MongoDB/HTTP suite covering admin-only access, private-field exclusion, search outside the current page, combined filters, malformed queries, page limits, stable sorting, and recovery after deletion. The strict test runner gives this suite its own fresh database. Added UI/cache tests and a Chromium admin journey covering search, history, lazy course access, Arabic, and mobile width.
- Local validation: **342 backend tests**, **131 frontend tests**, and **six Chromium journeys passed**. Reviewed desktop and Arabic mobile screenshots. Frontend lint, production build, and startup budget passed; deferred video-engine bundle warnings remain.

## Runtime error logging — 28 October 2026

- Migrated 80 handled-error log calls across account, course, progress, purchase, instructor, admin, manual-order, authentication, and media code to the structured logger. Error objects are reduced to known classifications/codes; messages, stacks, nested provider payloads, arbitrary error names/codes, and user records are excluded.
- Added asynchronous request context so handled errors carry the same server-generated ID as `X-Request-Id`. Concurrent requests remain separate, and background calls do not inherit an exited request's ID. Route templates and static event names avoid logging actual token paths.
- Removed provider-error reflection from legacy media-upload responses and rejected Stripe webhook responses. Existing authentication, access checks, upload verification, and enrollment behavior remain covered by the backend suite.
- **328 backend tests and five Chromium journeys passed**, including real isolated MongoDB integration tests and eight new cases covering sensitive-data exclusion, real password-reset failure handling, legacy response sanitization, and asynchronous/concurrent log correlation. Browser checks covered registration, verification, instructor approval, playback progress, direct file upload, catalog pagination, and mobile width.

## Vercel file uploads — 28 October 2026

- Moved avatar, thumbnail, quiz-image, and lecture-PDF file bodies to signed browser-to-Cloudinary uploads. API save requests contain an asset ID; client-supplied URLs, sizes, and MIME types do not determine the stored file.
- Upload IDs are unique, scoped to the account and purpose, and signed with overwrite disabled. Student accounts can request avatar uploads; teaching assets require instructor/admin access. Signature issuance and quiz-image verification are rate limited.
- Before persisting direct assets, the API checks their provider metadata, ownership, delivery type, supported image format, and 10 MiB size limit. Authenticated raw PDF files also require a `%PDF-` header, read through a server-generated, short-lived URL with a bounded stream. Existing course-manager and enrollment protections remain in place.
- Added a Chromium upload journey proving a 6 MiB PDF goes to the storage provider while the lecture-save body stays below 8 KiB. External storage is mocked in browser CI; an independent real Cloudinary check uploaded and verified a protected 6 MiB temporary PDF, then deleted that exact test asset. No platform accounts, courses, or orders were changed by that provider check.
- Local validation: **320 backend tests**, **126 frontend tests**, the four existing Chromium journeys, and the additional direct-upload journey passed. Frontend lint, build, and startup budget passed. The video-engine bundle-size warning remains.

## Hosted Vercel verification — 28 October 2026

- Created independent `tadaruj` and `tadaruj-api` Vercel projects using `client` and `server` roots and Node 22. Production deployments completed and the frontend was promoted to its assigned domain.
- Explicitly authorized platform service settings were transferred to backend environment secrets. A new session signing secret was generated. Local environment files, CLI tokens, databases, and test artifacts were excluded from deployment uploads.
- Verified the live API: liveness and warmed readiness return 200; the public catalog returns JSON; anonymous profile access returns 401; the assigned frontend origin receives the expected CORS header. An initial cold readiness probe returned 503 while the database connection was established, followed by successful readiness.
- Read-only Chromium checks against the deployed frontend passed for home, courses, about, login, and password recovery, including direct route reloads, visible demo notice, mobile width, and no uncaught rendering errors. No users, orders, payments, or real messages were created by these checks.
- The demo sender remains limited to the configured account-owner mailbox. Explicit demo mode retains production HTTPS/origin checks and forbids development verification/reset shortcuts. Added tests keep other recipients blocked. **290 backend tests passed** locally; frontend lint, build, and startup budget passed, and GitHub CI succeeded for the deployment preparation commit.
- Google sign-in was initially disabled pending origin authorization; the follow-up below records its activation. The Vercel Git connection was rejected, so current releases use CLI deployment rather than automatic deployment from GitHub pushes.

### Google origin follow-up

- Configured the public Google client ID on the hosted API and redeployed after the frontend origin was added in Google Cloud.
- Verified the actual deployed login page: backend challenge returned 200, Google's button renderer returned 200, the button was visible, and its popup opened `accounts.google.com/v3/signin/identifier` without origin-mismatch errors.
- No Google account was selected, no credentials were entered, and no platform user was created. This verifies the beginning of the hosted Google flow; completion using a personal account remains a separate check.

### GitHub deployment connection

- After granting Vercel access to this repository, both `tadaruj` and `tadaruj-api` were linked to repository ID `1435681733` (`omarmohamed-909/Tadaruj`) on production branch `main`.
- Verified the configured roots remain `client` and `server`, respectively. No unrelated repository permissions or project settings were changed.
- A documentation-only update in both project roots is used to verify GitHub-triggered production deployments without invoking the CLI deployment command.

## Phase 3 — 28 October 2026

- Separated the Express app from the standalone listener. Vercel imports a default handler; local and Docker processes own the listener and signal handlers.
- Added independent liveness and bounded readiness probes, safe JSON middleware errors, server-generated request IDs, structured request logs, and graceful shutdown with a 10-second deadline.
- Fixed the database connection cache retaining a settled promise after a lost connection. Connection selection is bounded to eight seconds and disconnected command buffering is disabled.
- Production startup now refuses incomplete service configuration, malformed frontend origins, enabled local shortcuts, and invalid proxy hop settings. `check:production` performs the existing read-only service checks under production rules without sending mail.
- The API image uses Node 22, runs as an unprivileged user, and has a liveness health check. CI additionally builds/starts that image against its isolated replica set and verifies readiness and denied anonymous access.
- Added a CI backup/restore drill using synthetic student, course, enrollment, progress, and unique-index fixtures. It restores into a different fresh database without dropping data; its archive stays inside the ephemeral container.
- Local validation: **288 backend tests passed** with real MongoDB and **4 Chromium journeys passed**, including live API health, enrollment approval, actual video completion, and mobile pagination. Frontend lint passed.
- The production configuration check intentionally reports **not ready** in this independent checkout: real production database, signing key, frontend origin, media, and sender settings have not been supplied here. No public deployment or real email/message/payment occurred in this phase.
- See [DEPLOYMENT.md](DEPLOYMENT.md) and [RECOVERY.md](RECOVERY.md). Public hosting, domain verification, delivery, off-site backup retention, and recovery against real platform data remain deployment tasks. Existing controller/provider logs have not all been migrated to the new logger.

## Phase 2 — 28 October 2026

- Public catalog, search, and instructor courses now use bounded pagination (12 by default, at most 24). Counts cover the full result set, sorting is stable, and page/filter state survives reload and browser history.
- Catalog filters come from a separate lightweight endpoint. Public listing responses exclude private lecture content and enrollment lists. Added indexes support published and instructor listings.
- Real MongoDB tests caught and verified a fix for price sorting precedence. The strict test runner generates fresh isolated database names and requires the dedicated local replica set.
- Local results: **267 backend tests passed** with real MongoDB; **122 frontend tests passed**; **3 Chromium journeys passed**, including the mobile catalog and actual video completion persisted after reload. ESLint, production build, and bundle budget passed.
- Startup JavaScript: **615,058 bytes**, **197,106 bytes gzipped**; brand assets: **281,036 bytes**. Deferred video-engine chunk warnings remain.
- Updated vulnerable dependency versions. `npm audit` reported **0 known vulnerabilities** in both projects at verification time; this is not a general security guarantee.
- CI now provisions an ephemeral MongoDB replica set and runs the full backend suite plus browser journeys without production secrets. Browser reports and failure artifacts are retained for seven days.
- The browser enrollment journey uses separate student and instructor sessions, verifies denial before approval, plays a synthetic local video to its real `ended` event, reads the saved progress through the authenticated API, and checks completion after reload. WhatsApp is fulfilled locally and outbound browser traffic is blocked; no real email, payment, or message is sent.
- External delivery services and deployment origins are outside this phase. See [TESTING.md](TESTING.md) for setup, test boundaries, and replaying failure traces.

## Phase 1 — 28 October 2026

- Completed interface localization for recovery, verification, instructor and admin workspaces, course details, learning progress, profile controls, and system notifications. User-authored names and content remain unchanged.
- Unified platform support links using the supplied WhatsApp number and Facebook URL.
- Added a branded catch-all 404, a router error fallback, and a rendering error boundary with retry. Internal error details are not shown in the fallback.
- Improved recovery forms with labeled controls, keyboard submission, localized validation, and a local-only reset shortcut.
- Frontend validation: **118 tests passed**, ESLint passed, production build passed, and startup bundle budget passed. Workspace translations load separately from the navigation bundle.
- New tests cover recovery validation and submission, language switching without repeating email verification, error boundary retry, missing-route recovery, preserving instructor request values, and notification localization.
- Browser checks used the independent frontend with the isolated local QA API: Arabic recovery form, instructor course creation UI, real unknown-route handling, and updated support links. No test email or WhatsApp message was sent during this phase.
- The deferred video-engine bundle-size warning remains. Backend behavior and external service deployment were outside this phase.

النسخة المستقلة تحتوي على اختبارات الواجهة والخادم وإعدادات البناء، وتبدأ بتاريخ Git جديد.

## نطاق الاختبارات

المراجعة المحلية للنسخة المستقلة: 256 اختبارًا للخادم (بما فيها 20 اختبار تكامل مع MongoDB معزولة) و109 اختبارات للواجهة نجحت. فحص ESLint والبناء وميزانية التحميل نجح؛ كود البداية 608,087 بايت، أو 194,233 مضغوطًا. يوجد تحذير لبعض محركات الفيديو المؤجلة الكبيرة.

- التحقق من التسجيل والتفعيل والاستعادة والأدوار وقيود الوصول إلى الكورسات.
- إنشاء طلبات WhatsApp واعتمادها داخل معاملات MongoDB ومنع اعتماد أموال المدرّس من حساب آخر.
- تحقق Google وربط الحسابات والحفاظ على الدور والكورسات واستهلاك nonce مرة واحدة.
- إرسال Resend، وفشل الإرسال، وقيد المستلم التجريبي، وإعادة المحاولة دون تكرار.
- اتساق الألوان وتباين النصوص، تسجيل الدخول، وحفظ الجلسة وعزل بيانات الحسابات.
- فصل أصول الواجهة المسموحة وعدم الاعتماد على نشر سابق أو معاينات استضافة غير محددة.

## إعادة التحقق

تحديث 29 أكتوبر 2026: نجح 358 اختبارًا للخادم و149 اختبارًا للواجهة. أضيفت
ثلاث رحلات إضافية للمتصفح (9 إجمالًا) لتعليق فحص الجلسة، وإعادة المحاولة، وقائمة الموبايل والعربي،
وتسجيل الدخول أثناء انتظار رد قديم. كود البداية أصبح 484,303 بايت، أو 155,541
بايت مضغوطًا. منهج قياس الشبكات الضعيفة وحدوده في
[تقرير الأداء](PERFORMANCE.md). الأرقام السابقة أعلاه توثّق مراجعة النسخة الأولى.

```powershell
npm test --prefix server
npm test --prefix client
npm run lint --prefix client
npm run build --prefix client
npm run check:bundle --prefix client
```

تتخطى اختبارات MongoDB الحقيقية إن لم تُحدد TEST_MONGO_URI وTEST_GOOGLE_MONGO_URI إلى قواعد اختبار جديدة منفصلة على 127.0.0.1:27028 مع replica set باسم codex-test. لا تستخدم قاعدة منصة فعلية أو قاعدة بها بيانات.

اختبارات البريد الخارجية محاكاة داخل الاختبارات الآلية. اختبارات الخدمة الحقيقية تتطلب مفاتيح خاصة وبريد اختبار مسموحًا ودومين إرسال موثقًا عند الاستخدام العام.

لا تتضمن النسخة قواعد بيانات أو حسابات تجريبية محفوظة أو أسرارًا أو صور نتائج اختبار تخص بيئة محلية سابقة. بعض محركات الفيديو المؤجلة قد تُظهر تحذير حجم أثناء البناء.

الأرقام العربية أعلاه تخص المراجعة المحلية السابقة. إعداد CI الحالي موضح في Phase 2: يشغّل MongoDB معزولة واختبارات المتصفح دون مفاتيح خارجية.

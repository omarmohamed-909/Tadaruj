# سجل التحقق — تدرّج

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

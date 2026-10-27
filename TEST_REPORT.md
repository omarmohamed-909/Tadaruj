# سجل التحقق — تدرّج

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

GitHub Actions يفحص اختبارات الخادم والواجهة والبناء عند الرفع وطلبات الدمج، دون مفاتيح خارجية. اختبارات MongoDB الحقيقية تتخطى في CI الحالي لعدم إعداد قاعدة هناك؛ نتائجها أعلاه من تشغيل محلي معزول.

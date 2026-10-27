# بريد تدرّج عبر Resend

تستخدم رسائل التفعيل وإعادة التفعيل واستعادة كلمة المرور ودعوات الإدارة دالة sendEmail المشتركة بمكتبة Resend الرسمية.

## الإعداد

استخدم حساب Resend خاصًا بتدرّج. أنشئ مفتاح Sending Access، وقيّده بدومين الإرسال عند توثيقه. احفظ المفتاح في server/.env الخاص وفي بيئة استضافة السيرفر فقط:

```dotenv
RESEND_API_KEY=
RESEND_FROM_EMAIL=
RESEND_REPLY_TO=
EMAIL_DELIVERY_ENABLED=true
RESEND_TEST_RECIPIENT=
```

- التشغيل العام يحتاج دومينًا تملكه، مع سجلات DNS التي يصدرها Resend وحالة Verified.
- من دون دومين، يمكن استخدام Tadaruj <onboarding@resend.dev> للتجربة. ضع بريد صاحب حساب Resend في RESEND_TEST_RECIPIENT؛ يمنع الكود المستلمين الآخرين ويمنع المرسل التجريبي في الإنتاج.
- يحدد FRONTEND_URL عنوان روابط التفعيل والاستعادة.
- لا توجد مفاتيح إرسال أو عناوين بريد خاصة مضمنة في هذا المستودع.

## الفحص

```powershell
npm run check:setup --prefix server
npm run check:setup --prefix server -- --services
npm run email:test --prefix server -- --to your-owned-email@example.com
```

فحص الإعدادات لا يرسل رسائل ولا يطبع المفاتيح. مفتاح الإرسال المحدود لا يملك فحص مصادقة قراءة عامًا؛ لذلك لا يزعم فحص الإعدادات نجاح التسليم.

أمر email:test يرسل رسالة اختبار حقيقية واحدة. accepted يعني قبول Resend للرسالة، بينما Delivered أو Bounced تُراجع من لوحة Resend. إعادة المحاولة محدودة وتستخدم Idempotency Key ثابتًا لمنع تكرار الرسائل.

## اختبار المتصفح

سكربت server/scripts/startJourneyTest.js يستخدم قاعدة اختبار محلية مستقلة ويوقف البريد افتراضيًا. TEST_ALLOW_REAL_EMAIL=true يسمح باختبار صريح؛ المرسل التجريبي يظل محصورًا في RESEND_TEST_RECIPIENT. لا تستخدم هذه البيانات أو اختصارات التفعيل المحلية في الإنتاج.

المراجع: [Resend Node.js](https://resend.com/docs/send-with-nodejs)، [حدود المرسل التجريبي](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

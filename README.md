# تدرّج | Tadaruj

منصة تعليمية مستقلة لكل المواد، بواجهة عربية وإنجليزية ووضع فاتح وداكن.

## المزايا

- عرض المدرّسين وملفاتهم العامة وكورسات كل مدرّس.
- البحث عن الكورسات حسب المادة والمرحلة والسعر.
- حسابات طالب ومدرّس ومدير منصة بصلاحيات منفصلة.
- تسجيل البريد وكلمة المرور وتسجيل Google مع تحقق على السيرفر وربط آمن للحسابات.
- تفعيل البريد واستعادة كلمة المرور ودعوات الإدارة عبر Resend.
- فيديوهات وملفات محمية عبر Cloudinary، واختبارات وتعليقات وحفظ تقدّم الطالب.
- طلبات اشتراك عبر WhatsApp؛ كل مدرّس يستلم أمواله ويؤكد طلباته بنفسه.

## التقنية

React 19 وVite وTailwind CSS وRedux Toolkit للواجهة، وExpress وMongoDB وMongoose للخادم. استخدام Node.js 22.12 أو أحدث موصى به.

## التشغيل المحلي

```powershell
git clone https://github.com/omarmohamed-909/Tadaruj.git
cd Tadaruj
npm ci --prefix server
npm ci --prefix client
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env.local
```

املأ إعدادات السيرفر المحلية. يجب أن تكون MongoDB من نوع replica set لدعم اعتماد المدفوعات داخل transaction. استخدم قاعدة خاصة بتدرّج.

في نافذتين منفصلتين:

```powershell
npm run dev --prefix server
npm run dev --prefix client
```

الواجهة الافتراضية على http://localhost:5173 وAPI على http://localhost:8080. عدّل VITE_API_BASE_URL إذا اختلف عنوان API، وأعد تشغيل Vite بعد تعديل البيئة.

## الإعدادات الخارجية

- MongoDB وSECRET_KEY طويل وعشوائي لجلسات الدخول.
- Cloudinary لرفع الوسائط المحمية.
- GOOGLE_CLIENT_ID العام، مع تسجيل أصل الواجهة في عميل Google.
- RESEND_API_KEY وRESEND_FROM_EMAIL من حساب تدرّج المستقل. إرسال الرسائل لكل الطلاب يحتاج دومين موثّق. المرسل التجريبي resend.dev يقتصر على بريد صاحب حساب Resend.
- FRONTEND_URL وFRONTEND_URLS لعناوين الواجهة المسموحة وروابط البريد. في الإنتاج لا تُقبل معاينات استضافة أو روابط مشاريع أخرى تلقائيًا.
- مفاتيح Stripe اختيارية فقط للتحقق من عمليات قديمة؛ الطلبات الجديدة تستخدم WhatsApp.

الملفات الفعلية للبيئة غير موجودة في المستودع. لا تضع مفاتيح خاصة داخل client أو متغيرات VITE_*.

التفاصيل في [إعداد البريد](EMAIL_SETUP.md) و[إعداد Google](GOOGLE_AUTH_SETUP.md).

## الإدارة

بعد إنشاء حساب وتفعيله، استخدم bootstrap:admin مرة واحدة كما يلي، من بيئة آمنة على السيرفر:

```powershell
$env:BOOTSTRAP_ADMIN_EMAIL="your-admin@example.com"
$env:BOOTSTRAP_ADMIN_SECRET="a-random-secret-of-at-least-24-characters"
npm run bootstrap:admin --prefix server
```

أزل متغيري bootstrap بعد الانتهاء. الحسابات الإدارية الإضافية تُنشأ بدعوات من لوحة الإدارة. لا توجد كلمات مرور افتراضية أو حسابات إدارة جاهزة داخل المستودع.

## التحقق

```powershell
npm test --prefix server
npm test --prefix client
npm run lint --prefix client
npm run build --prefix client
npm run check:bundle --prefix client
npm run check:setup --prefix server
```

اختبارات التكامل الحقيقية تحتاج قواعد مؤقتة منفصلة على MongoDB المحلية المحددة في اختبارات المشروع؛ تتخطى افتراضيًا إن لم تُحدد متغيراتها. فحص الإعدادات لا يرسل بريدًا تلقائيًا. إرسال اختبار بريدي صريح:

```powershell
npm run email:test --prefix server -- --to your-owned-email@example.com
```

## النشر

الواجهة في client والخادم في server، وكل جزء يمكن نشره مستقلًا. إعدادات Vercel وصورة Docker الخاصة بالخادم موجودة. اضبط VITE_API_BASE_URL على API الخاصة بتدرّج وFRONTEND_URL على دومينها، وأضف الأصل نفسه إلى إعداد Google. يوجد تحميل مؤجّل لصفحات المنصة ومحركات الفيديو؛ بعض ملفات الفيديو الكبيرة ما زالت تُظهر تحذير حجم أثناء البناء.

راجع [سجل التحقق](TEST_REPORT.md) قبل الإطلاق. نجاح البناء وحده لا يعني ضبط الدومين أو البريد أو قاعدة البيانات الإنتاجية.

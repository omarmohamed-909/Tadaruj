<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="client/public/tadaruj-logo-dark.webp">
  <source media="(prefers-color-scheme: light)" srcset="client/public/tadaruj-logo.webp">
  <img src="client/public/tadaruj-logo.webp" alt="Tadaruj — تدرّج" width="210">
</picture>

# Tadaruj · تدرّج

**كل مادة ليها بداية. وكل خطوة بتفرق.**

منصة تعليمية تجمع الطلاب والمدرّسين في مكان واحد، لمواد ومراحل مختلفة.<br>
اكتشف مدرّسك، اختار كورسك، وكمّل تعلّمك بالعربي أو الإنجليزي.

**React 19 · Express 5 · MongoDB · Tailwind CSS 4**

[المزايا](#features) · [التشغيل المحلي](#quick-start) · [الإعدادات](#configuration) · [الاختبارات](#checks) · [التوثيق](#documentation)

</div>

---

<a id="overview"></a>
## عن المنصة

تدرّج مبنية حول المدرّس وتجربة الطالب: الصفحة الرئيسية تعرّف الزائر بمدرّسي المنصة، ولكل مدرّس ملف عام يعرض كورساته المنشورة. الكتالوج له صفحة مستقلة للبحث والتصفية، والمحتوى متاح لمختلف المواد، من اللغات والعلوم إلى التكنولوجيا والعلوم الإنسانية.

المستودع يضم الواجهة والخادم معًا، ويحتفظ بإعدادات تشغيل ونشر منفصلة لكل جزء.

<a id="features"></a>
## ما الذي تقدمه تدرّج؟

| المجال | الموجود في المنصة |
| --- | --- |
| اكتشاف المحتوى | بطاقات المدرّسين، ملفات عامة، وكورسات قابلة للبحث والتصفية حسب المادة والمرحلة والسعر |
| تجربة التعلّم | دروس فيديو، ملفات مرفقة، اختبارات، تعليقات، وحفظ تقدّم الطالب |
| الحسابات | التسجيل بالبريد وكلمة المرور أو Google، تفعيل البريد، واستعادة كلمة المرور |
| إدارة المحتوى | أدوات للمدرّس لإدارة كورساته ودروسه واختباراته وطلبات الاشتراك |
| إدارة المنصة | لوحة إدارة للحسابات والمحتوى والطلبات، مع دعوات إدارية وسجل للعمليات |
| الواجهة | العربية والإنجليزية، اتجاه RTL/LTR، وضع فاتح وداكن، وتصميم يستجيب للشاشات المختلفة |
| الخدمات | Resend للبريد، Cloudinary للوسائط، وWhatsApp للتواصل بشأن الاشتراكات |

### الحسابات والصلاحيات

| الحساب | الاستخدام |
| --- | --- |
| **طالب** | استكشاف المدرّسين والكورسات، طلب الاشتراك، والوصول إلى المحتوى المتاح له ومتابعة تقدّمه |
| **مدرّس** | إدارة محتواه وطلبات طلابه، وتأكيد المدفوعات التي استلمها بنفسه |
| **مدير المنصة** | الإشراف على المنصة وإدارة الحسابات والمحتوى وسجل العمليات؛ تأكيد استلام أموال المدرّس يظل للمدرّس صاحب الطلب |

### كيف يعمل الاشتراك؟

1. يختار الطالب كورسًا مدفوعًا وينشئ طلب اشتراك.
2. يفتح محادثة WhatsApp مع المدرّس تتضمن تفاصيل الكورس ورقم الطلب.
3. يتفق الطالب والمدرّس على وسيلة الدفع؛ كل مدرّس يستلم أمواله مباشرة.
4. بعد التحقق من وصول المبلغ، يؤكد المدرّس الطلب من لوحة التحكم، فيُمنح الطالب الوصول إلى الكورس.

**إنشاء الطلب أو فتح WhatsApp لا يمنح الوصول تلقائيًا.** يشترط نشر الكورس المدفوع إضافة رقم WhatsApp للمدرّس. الكود المتبقي لـStripe مخصص للتحقق من عمليات قديمة؛ الطلبات الجديدة تستخدم المسار أعلاه.

<a id="stack"></a>
## التقنية

| الجزء | الأدوات |
| --- | --- |
| الواجهة | React 19، Vite 7، React Router 7، Redux Toolkit / RTK Query |
| التصميم | Tailwind CSS 4، Radix UI، Lucide |
| الخادم | Node.js، Express 5، Mongoose 8 |
| قاعدة البيانات | MongoDB مع replica set لدعم معاملات تأكيد الاشتراك |
| الدخول والبريد | Google Identity Services، JWT، Resend |
| الوسائط | Cloudinary وروابط وصول موقّعة محددة المدة |
| التحقق | Vitest، React Testing Library، ESLint، GitHub Actions |

<a id="quick-start"></a>
## التشغيل المحلي

### 1. المتطلبات

- **Node.js 22.12 أو أحدث** مع npm؛ إعداد CI الحالي يستخدم Node.js 22.
- Git وصلاحية الوصول إلى المستودع.
- MongoDB محلية أو مستضافة، مع **replica set** لدعم معاملات تأكيد الاشتراك.
- إعداد الخدمات التي تريد اختبارها: Resend للبريد، Cloudinary للوسائط، وGoogle للدخول.

### 2. تنزيل المشروع وتثبيت الحزم

```sh
git clone https://github.com/omarmohamed-909/Tadaruj.git
cd Tadaruj

npm ci --prefix server
npm ci --prefix client
```

أنشئ ملفات البيئة من الأمثلة الموجودة. على **PowerShell**:

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env.local
```

<details>
<summary>على macOS أو Linux</summary>

```sh
cp server/.env.example server/.env
cp client/.env.example client/.env.local
```

</details>

املأ القيم الخاصة ببيئتك قبل التشغيل؛ ملفات الأمثلة وحدها لا تربط قاعدة بيانات أو حسابات خدمات فعلية.

### 3. تشغيل الخادم والواجهة

في نافذة طرفية أولى، من جذر المشروع:

```sh
npm run dev --prefix server
```

وفي نافذة ثانية، من الجذر أيضًا:

```sh
npm run dev --prefix client
```

| الخدمة | العنوان عند استخدام إعدادات الأمثلة |
| --- | --- |
| الواجهة | [localhost:5173](http://localhost:5173) |
| الخادم | `http://localhost:8080` |
| مسارات API | `http://localhost:8080/api/v1` |

لو اختار Vite منفذًا آخر، استخدم العنوان الذي يظهر في الطرفية، وأضف أصل الواجهة الفعلي إلى إعدادات الخادم وGoogle عند الحاجة. أعد تشغيل Vite بعد تغيير متغيرات بيئة الواجهة.

<a id="configuration"></a>
## الإعدادات

### الواجهة — `client/.env.local`

| المتغير | الاستخدام |
| --- | --- |
| `VITE_API_BASE_URL` | عنوان الخادم **دون** `/api/v1`؛ مثل `http://localhost:8080` |

إذا لم يُحدد العنوان، تستخدم الواجهة `http://localhost:8080` على localhost، ومسارات API من نفس أصل الموقع عند النشر.

### الخادم — `server/.env`

| المجموعة | المتغيرات | المطلوب |
| --- | --- | --- |
| التشغيل | `PORT`، `MONGO_URI`، `SECRET_KEY` | منفذ الخادم، قاعدة خاصة بالمنصة، ومفتاح جلسات طويل وعشوائي |
| عناوين الواجهة | `FRONTEND_URL`، `FRONTEND_URLS` | أصل الواجهة الأساسي لروابط البريد، والأصول الإضافية المسموحة مفصولة بفواصل |
| Google | `GOOGLE_CLIENT_ID` | معرّف عميل Web؛ يجب تسجيل أصول الواجهة نفسها في Google Cloud |
| الوسائط | `CLOUDINARY_CLOUD_NAME`، `CLOUDINARY_API_KEY`، `CLOUDINARY_API_SECRET` | حساب Cloudinary لرفع الوسائط وتقديم روابط الوصول |
| البريد | `RESEND_API_KEY`، `RESEND_FROM_EMAIL` | مفتاح إرسال Resend وهوية المرسل |
| تخصيص البريد | `RESEND_REPLY_TO`، `EMAIL_DELIVERY_ENABLED`، `RESEND_TEST_RECIPIENT` | عنوان الرد، تفعيل الإرسال، وقيد مستلم الاختبار |
| الوكيل العكسي | `TRUST_PROXY_HOPS` | عدد طبقات الوكيل الموثوقة حسب الاستضافة؛ الافتراضي `0` |

- **Google:** التنفيذ يحتاج Client ID فقط؛ لا يحتاج Client Secret أو صلاحيات Gmail وDrive. راجع [دليل Google](GOOGLE_AUTH_SETUP.md).
- **Resend:** الإرسال العام يحتاج دومينًا موثّقًا. المرسل التجريبي `resend.dev` محصور في بريد صاحب حساب Resend، ويمنعه التطبيق في الإنتاج. راجع [دليل البريد](EMAIL_SETUP.md).
- **الأسرار:** ملفات البيئة الفعلية مستبعدة من Git. أي قيمة `VITE_*` تصل إلى المتصفح؛ احتفظ بالمفاتيح الخاصة في الخادم فقط.
- إعدادات روابط التفعيل والاستعادة المحلية `ALLOW_DEV_VERIFICATION_LINKS` و`ALLOW_DEV_RESET_LINKS` تظل `false` عند الاستخدام العادي.

المرجع الكامل للقيم المتاحة هو [مثال بيئة الخادم](server/.env.example) و[مثال بيئة الواجهة](client/.env.example).

<a id="administration"></a>
## إنشاء أول مدير للمنصة

لا توجد حسابات إدارة أو كلمات مرور افتراضية. أنشئ حسابًا عاديًا وفعّل بريده أولًا، ثم نفّذ التالي من جذر المشروع في **PowerShell** داخل بيئة الخادم الموثوقة:

```powershell
$env:BOOTSTRAP_ADMIN_EMAIL="your-admin@example.com"
$env:BOOTSTRAP_ADMIN_SECRET=[guid]::NewGuid().ToString("N")
npm run bootstrap:admin --prefix server

Remove-Item Env:BOOTSTRAP_ADMIN_EMAIL
Remove-Item Env:BOOTSTRAP_ADMIN_SECRET
```

السكربت يرقّي الحساب المحدد فقط، ويسجل العملية، ويرفض العمل إذا كان هناك مدير بالفعل. بعد ذلك، استخدم دعوات لوحة الإدارة لإضافة مديرين آخرين.

<a id="checks"></a>
## الاختبارات والتحقق

نفّذ الأوامر التالية من جذر المشروع:

```sh
npm test --prefix server
npm test --prefix client
npm run lint --prefix client
npm run build --prefix client
npm run check:bundle --prefix client
```

[GitHub Actions](https://github.com/omarmohamed-909/Tadaruj/actions/workflows/ci.yml) يشغّل اختبارات الخادم والواجهة وESLint والبناء وفحص ميزانية التحميل عند الرفع وطلبات الدمج.

اختبارات MongoDB الفعلية تتخطى افتراضيًا، بما في ذلك CI الحالي؛ تشغيلها يحتاج قاعدتي اختبار معزولتين عبر `TEST_MONGO_URI` و`TEST_GOOGLE_MONGO_URI` على بيئة الاختبار المحلية المحددة. تفاصيل التشغيل والنتائج موجودة في [سجل التحقق](TEST_REPORT.md).

### فحص إعداد الخدمات

```sh
npm run check:setup --prefix server
npm run check:setup --prefix server -- --services
```

الفحص لا يرسل بريدًا. لإرسال رسالة اختبار فعلية إلى بريد تملكه وتسمح له إعدادات حساب Resend:

```sh
npm run email:test --prefix server -- --to your-owned-email@example.com
```

قبول Resend للرسالة لا يعني تسليمها؛ تُراجع حالة التسليم من لوحة Resend.

<a id="structure"></a>
## هيكل المشروع

```text
Tadaruj/
├── client/
│   ├── public/              # الهوية والملفات العامة
│   ├── src/
│   │   ├── components/      # مكونات الواجهة
│   │   ├── features/        # حالة التطبيق والتعامل مع API
│   │   ├── pages/           # صفحات المنصة
│   │   └── lib/             # أدوات الواجهة المشتركة
│   └── .env.example
├── server/
│   ├── controllers/         # منطق طلبات API
│   ├── middlewares/         # التحقق من الدخول والصلاحيات
│   ├── models/              # نماذج MongoDB
│   ├── routes/              # مسارات API
│   ├── scripts/             # فحص الإعدادات والإدارة والاختبار
│   ├── utils/               # البريد والوسائط وأدوات مشتركة
│   └── .env.example
├── .github/workflows/       # التحقق الآلي
├── EMAIL_SETUP.md
├── GOOGLE_AUTH_SETUP.md
└── TEST_REPORT.md
```

<a id="deployment"></a>
## البناء والنشر

يمكن نشر الواجهة والخادم بشكل مستقل. يتضمن المستودع إعدادات Vercel لكليهما وDockerfile للخادم.

1. ابنِ الواجهة باستخدام `npm run build --prefix client`؛ ملفات النشر تظهر في `client/dist`.
2. اضبط `VITE_API_BASE_URL` قبل بناء الواجهة على عنوان API الفعلي، وشغّل الخادم باستخدام `npm start --prefix server`.
3. اضبط `NODE_ENV=production` وقاعدة البيانات والأسرار في بيئة استضافة الخادم.
4. حدّث `FRONTEND_URL` و`FRONTEND_URLS`، وأضف أصل الدومين إلى عميل Google، ووثّق دومين البريد في Resend.
5. راجع [سجل التحقق](TEST_REPORT.md)، واختبر التسجيل والتفعيل والدخول والاشتراك والوصول إلى المحتوى على بيئة النشر.

نجاح CI لا يتحقق من بيانات الخدمات الخارجية أو إعدادات الدومين. بعض محركات الفيديو المحمّلة عند الحاجة ما زالت تنتج تحذير حجم أثناء البناء؛ راجع ذلك عند تقييم أداء النشر.

<a id="documentation"></a>
## التوثيق

| الدليل | المحتوى |
| --- | --- |
| [إعداد الواجهة](client/README.md) | متغير API وأوامر تطوير الواجهة |
| [إعداد البريد](EMAIL_SETUP.md) | Resend، المرسل التجريبي، الدومين، وفحص الإرسال |
| [تسجيل Google](GOOGLE_AUTH_SETUP.md) | إعداد عميل Google وسلوك ربط الحسابات |
| [سجل التحقق](TEST_REPORT.md) | نتائج الاختبارات ونطاقها وحدود التحقق |

---

<div align="center">

**تدرّج · Tadaruj**<br>
تعلّم على مهلك. وتقدّم كل يوم.

</div>

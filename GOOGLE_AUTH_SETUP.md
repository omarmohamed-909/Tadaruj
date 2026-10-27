# تسجيل Google في تدرّج

التنفيذ يستخدم Google Identity Services وزر Google الرسمي، ويتحقق من ID token على السيرفر بمكتبة google-auth-library.

1. أنشئ أو استخدم مشروع Google Cloud يخص تدرّج.
2. اضبط اسم التطبيق وبريد الدعم والتواصل والجمهور المناسبين.
3. أنشئ OAuth client من نوع Web application.
4. أضف أصل الموقع إلى Authorized JavaScript origins، مثل http://localhost وhttp://localhost:5173 للتطوير.
5. ضع المعرّف العام في GOOGLE_CLIENT_ID ببيئة السيرفر. لا يحتاج هذا التنفيذ Client Secret أو صلاحيات Gmail/Drive.
6. اضبط FRONTEND_URL وFRONTEND_URLS على أصول تدرّج الفعلية، ثم أعد تشغيل السيرفر.

الربط يستخدم popup وJavaScript callback؛ لا يحتاج Redirect URI. إعدادات Vercel وVite تضبط Cross-Origin-Opener-Policy لتوافق نافذة Google.

الحساب الجديد طالب فقط. تطابق البريد مع حساب قديم لا يربط الحساب تلقائيًا؛ يلزم تأكيد كلمة مروره. حسابات Google ذات البريد الخارجي تحتاج تحقق صندوق البريد داخل تدرّج، وحسابات Gmail/Workspace الموثقة تُفعّل مباشرة.

كل محاولة مرتبطة بـnonce لمدة خمس دقائق وأصل الواجهة وClient ID، وتُستهلك مرة واحدة. المعرّف الدائم للحساب هو Google sub، ولا تُخزّن Google access/refresh tokens.

لا يتضمن هذا المستودع مفاتيح فعلية أو إعدادات حساب Cloud خاص. عند نشر دومين جديد، سجّله في Google واضبط متغيرات بيئة السيرفر.

المراجع: [Google Identity Services](https://developers.google.com/identity/gsi/web/guides/overview)، [التحقق من الرمز](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

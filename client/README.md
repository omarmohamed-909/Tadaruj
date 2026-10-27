# Tadaruj frontend

واجهة تدرّج المبنية بـReact وVite.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

VITE_API_BASE_URL هو عنوان الخادم دون /api/v1. إذا لم يُحدد، يستخدم التطوير http://localhost:8080 والإنتاج API من نفس أصل الموقع. لا توجد عناوين خوادم قديمة مضمنة.

أوامر التحقق: npm test، npm run lint، npm run build، ثم npm run check:bundle.

لا تُضف أسرار Google أو Resend أو Cloudinary إلى الواجهة.

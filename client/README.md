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

## Hosted deployment

The Vercel project `tadaruj` builds this `client/` directory using Node 22 and publishes `dist/` at [tadaruj-phi.vercel.app](https://tadaruj-phi.vercel.app).

The project is connected to `omarmohamed-909/Tadaruj`; its production branch is `main`. Frontend build variables are configured on Vercel. See [the deployment guide](../DEPLOYMENT.md) for the demo email restriction, service setup, and optional manual release commands.

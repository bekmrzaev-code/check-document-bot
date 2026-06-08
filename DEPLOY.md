# Render'ga deploy qilish (uxlab qolmaydigan)

Bu loyiha — Express API + Telegram bot + scheduler + `/admin` panel. Render
bepul "Web Service" sifatida ishlaydi va o'zini-o'zi ping qilib **uxlab qolmaydi**.

## 1. Muhim: ma'lumotlar bazasi (Supabase)
Render'ning bepul diski **efemer** — har deploy'da SQLite o'chib ketadi.
Shuning uchun **`DATABASE_URL` (Supabase Postgres)** ishlatish shart:

1. Supabase → **Project Settings → Database → Connection string → "Transaction pooler" (URI)**
2. `[YOUR-PASSWORD]` o'rniga DB parolingizni qo'ying. Masalan:
   `postgresql://postgres.kfdlxhyvwcsehpiwdabx:PAROL@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`
3. Jadvallar birinchi ishga tushganda avtomatik yaratiladi (yoki `supabase/schema.sql` ni Supabase SQL Editor'da ishga tushiring).

## 2. Render'da yaratish
1. [render.com](https://render.com) → **New → Blueprint** → repo'ni tanlang (`render.yaml` o'qiladi).
   (Yoki **New → Web Service** qo'lda: Build = `npm install --include=dev && npm run build`, Start = `npm start`.)
2. **Environment** bo'limida quyidagilarni qo'ying:

| Kalit | Qiymat |
|------|--------|
| `BOT_TOKEN` | Telegram bot tokeningiz |
| `ADMIN_PASSWORD` | admin panel paroli |
| `DATABASE_URL` | Supabase connection string (1-qadam) |
| `ADMIN_CHAT_ID` | (ixtiyoriy) |
| `PRIVATE_CHANNEL_ID` | (ixtiyoriy) |
| `NODE_ENV` | `production` |
| `TZ` | `Asia/Tashkent` (scheduler vaqti to'g'ri bo'lishi uchun) |

`PORT` va `RENDER_EXTERNAL_URL` — Render avtomatik beradi, qo'lda kerak emas.

3. **Deploy** bosing.

## 3. Uxlab qolmaslik (keep-alive)
`src/keepAlive.ts` har **14 daqiqada** `RENDER_EXTERNAL_URL/health` ga ping yuboradi —
servis hech qachon 15 daqiqa harakatsiz qolmaydi. Hech narsa sozlash shart emas
(Render `RENDER_EXTERNAL_URL`ni avtomatik beradi). Intervalni o'zgartirish uchun:
`KEEPALIVE_INTERVAL_MS` env qo'ying.

> Eslatma: bepul plan oyiga ~750 soat beradi — bitta servis uchun 24/7 ishlashga yetadi.
> Yana ishonchliroq bo'lishi uchun tashqi monitor (UptimeRobot / cron-job.org) bilan
> `/health` ni har 10 daqiqada ping qilsangiz ham bo'ladi.

## 4. Bot privacy
Bot guruh xabarlarini ko'rishi uchun: **@BotFather → /setprivacy → Disable**.

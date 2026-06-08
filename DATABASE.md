# Ma'lumotlar bazasi — sozlash va bepul variantlar

## Hozirgi holat

Ilova **SQLite** ishlatadi — fayl asosidagi, o'rnatish talab qilmaydi. Ma'lumotlar `data/db.sqlite` faylida saqlanadi.

### Jadvallar

| Jadval | Maqsad |
|--------|--------|
| `drivers` | Haydovchilar |
| `uploads` | Yuklangan rasmlar (pending/approved/rejected) |
| `approved_images` | Tasdiqlangan rasmlar (file_id + message_id) |
| `companies` | Kompaniyalar |
| `settings` | Kanal ID va boshqa sozlamalar |
| `telegram_groups` | Bot qo'shilgan guruhlar |
| `admin_sessions` | Admin sessiyalari (server qayta ishga tushganda ham saqlanadi) |

### Sozlash

```env
DB_PATH=./data/db.sqlite
```

---

## Bepul ma'lumotlar bazasi variantlari (production uchun)

### 1. Turso (tavsiya etiladi — SQLite mos)

- **Narx:** Bepul tier (500 MB, 9M o'qish/oy)
- **Sayt:** https://turso.tech
- **Afzallik:** SQLite bilan mos — minimal kod o'zgarishi
- **Qachon:** Kichik/o'rta loyiha, edge deployment

### 2. Supabase (PostgreSQL)

- **Narx:** Bepul tier (500 MB DB, 50K MAU)
- **Sayt:** https://supabase.com
- **Afzallik:** REST API, auth, real-time, dashboard
- **Qachon:** Kelajakda mobil ilova yoki murakkab funksiyalar kerak bo'lsa

### 3. Neon (PostgreSQL serverless)

- **Narx:** Bepul tier (0.5 GB storage)
- **Sayt:** https://neon.tech
- **Afzallik:** Tez sozlash, avtomatik uyqu rejimi
- **Qachon:** Vercel/Railway da deploy qilmoqchi bo'lsangiz

### 4. Railway / Render + SQLite volume

- **Narx:** Railway $5 kredit/oy (bepul tier cheklangan)
- **Afzallik:** Hozirgi kodni o'zgartirmasdan ishlaydi
- **Qachon:** Tez deploy, oddiy MVP

### 5. MongoDB Atlas (agar NoSQL kerak bo'lsa)

- **Narx:** Bepul tier (512 MB)
- **Sayt:** https://www.mongodb.com/atlas
- **Eslatma:** Hozirgi kod SQL — migratsiya katta ish

---

## Qaysi birini tanlash?

| Vaziyat | Tavsiya |
|---------|---------|
| Lokal rivojlantirish | SQLite (hozirgi) |
| Production MVP | **Turso** yoki **Railway + SQLite volume** |
| Katta loyiha | **Supabase** yoki **Neon** |
| Telegram bot 24/7 | VPS (Hetzner ~€4/oy) + SQLite |

---

## Backup

SQLite faylini muntazam nusxalang:

```bash
cp data/db.sqlite data/backup-$(date +%Y%m%d).sqlite
```

Production uchun cron job yoki cloud storage (S3, Backblaze B2) ga avtomatik backup qo'ying.

# Ma'lumotlar bazasi — Supabase (Postgres)

## Hozirgi holat

Ilova **faqat Supabase (Postgres)** bilan ishlaydi. Lokal `.db` / SQLite fayllar ishlatilmaydi — barcha ma'lumot Supabase'da saqlanadi.

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
| `scheduled_messages` | Kunlik rejalashtirilgan xabarlar |

Jadvallar server birinchi ishga tushganda avtomatik yaratiladi (`CREATE TABLE IF NOT EXISTS`). Xohlasangiz `supabase/schema.sql` ni Supabase SQL editor'da qo'lda ham ishga tushirishingiz mumkin.

## Sozlash

1. https://supabase.com da loyiha oching (bepul tier yetarli: 500 MB DB).
2. **Project Settings → Database → Connection string** dan **Transaction pooler** ulanish satrini oling.
3. `.env` ga yozing:

```env
DATABASE_URL=postgresql://postgres.<project-ref>:<DB_PASSWORD>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

`DATABASE_URL` **majburiy** — u bo'lmasa server ishga tushmaydi.

Render'da deploy qilganda `DATABASE_URL` ni dashboard'dagi environment variables'ga qo'shing (`render.yaml` da `sync: false` qilib belgilangan).

## Backup

Supabase bepul tier'da ham kunlik avtomatik backup bor (Dashboard → Database → Backups). Qo'lda nusxa olish uchun:

```bash
pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d).sql
```

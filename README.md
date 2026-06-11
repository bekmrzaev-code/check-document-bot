# 🚗 Driver Approval MVP - Telegram Bot System

A lightweight, production-ready Telegram bot system for driver image approval. Drivers upload images in a Telegram group, admins approve/reject them via a web panel, and approved images are stored in a private channel.

## ✨ Features

- **Group Image Collection**: Drivers send images in Telegram group
- **Admin Web Panel**: Simple HTML interface for approving/rejecting uploads
- **Private Channel Storage**: Approved images stored in Telegram private channel (message_id only)
- **Driver Gallery**: Public web app to search and view approved drivers/companies
- **Supabase Database**: Postgres storage hosted on Supabase
- **Telegram Notifications**: Admin receives approval notifications
- **Batch Image Support**: Multiple images per upload
- **Company Management**: Organize drivers by companies

## 🏗️ Architecture

```
Single Express.js monolithic app

src/
├── index.ts                 # Main Express app
├── bot/
│   └── telegram.ts         # Telegraf bot implementation
├── routes/
│   ├── uploads.ts          # Upload approval endpoints
│   ├── drivers.ts          # Driver search/list
│   ├── companies.ts        # Company management
│   └── auth.ts             # Admin authentication
├── services/
│   ├── driver.service.ts
│   ├── upload.service.ts
│   ├── company.service.ts
│   └── approved-image.service.ts
├── storage/
│   └── database.ts         # Supabase (Postgres) database
├── middleware/
│   └── admin.ts            # Admin auth middleware
├── types/
│   └── index.ts            # TypeScript types
├── admin/
│   ├── index.html          # Admin login page
│   └── dashboard.html      # Admin dashboard
public/
└── index.html              # Driver gallery app
```

## 📋 System Flow

### 1️⃣ Driver Upload Flow
1. Driver sends images in Telegram group
2. Bot collects images (batches after 5s of inactivity)
3. Bot creates PENDING upload record
4. Admin notified via Telegram

### 2️⃣ Admin Approval Flow
1. Admin opens web panel (`/admin`)
2. Admin reviews pending uploads
3. Admin clicks APPROVE or REJECT
4. If approved:
   - Images uploaded to private channel
   - Message IDs saved to database
   - Driver status updated to APPROVED
5. If rejected:
   - Upload marked as REJECTED
   - Cached images deleted

### 3️⃣ Driver Gallery Flow
1. User visits `/` (public web app)
2. Searches for driver/company
3. Views approved images gallery
4. Images fetched from Telegram via message_id

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Telegram Bot Token
- Telegram Admin Chat ID
- Telegram Private Channel ID

### 1. Setup Telegram Bot

1. Create bot with [@BotFather](https://t.me/botfather) on Telegram
2. Get your bot token
3. Create a **group** and add your bot
4. Create a **private channel** and add your bot as admin
5. Get your user/channel IDs using [@userinfobot](https://t.me/userinfobot)

### 2. Install & Configure

```bash
# Clone/setup project
cd check-document-bot

# Install dependencies
npm install

# Copy env file
cp .env.example .env

# Edit .env with your values
nano .env
```

**.env file:**
```env
# Telegram
BOT_TOKEN=your_bot_token_here
ADMIN_CHAT_ID=your_admin_chat_id_here
PRIVATE_CHANNEL_ID=your_private_channel_id_here

# Admin
ADMIN_PASSWORD=admin123

# Server
PORT=3000
NODE_ENV=development

# Database (required) — Supabase Postgres connection string
DATABASE_URL=postgresql://postgres.<project-ref>:<DB_PASSWORD>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

### 3. Build & Run

```bash
# Development (with auto-reload)
npm run dev

# Production
npm run build
npm start
```

Server runs on `http://localhost:3000`

## 📱 Web Interfaces

### Admin Panel
**URL:** `http://localhost:3000/admin`

**Features:**
- Login with admin password
- View pending uploads with driver info
- Approve/Reject individual uploads
- Create companies
- Manage driver assignments

### Driver Gallery
**URL:** `http://localhost:3000`

**Features:**
- Search approved drivers
- Browse companies
- View approved images gallery
- Public access (no auth required)

## 🔌 API Endpoints

### Authentication
```
POST /api/auth/login          # Admin login
POST /api/auth/logout         # Admin logout
```

### Uploads (Admin only)
```
GET  /api/uploads/pending     # List pending uploads
GET  /api/uploads/:id         # Get upload details
POST /api/uploads/:id/approve # Approve upload
POST /api/uploads/:id/reject  # Reject upload
```

### Drivers (Public)
```
GET /api/drivers              # List all approved drivers
GET /api/drivers/:id          # Get driver by ID
GET /api/drivers/search/:query # Search drivers
POST /api/drivers/:id/assign   # Assign to company (Admin only)
```

### Companies (Public)
```
GET /api/companies            # List all companies
GET /api/companies/search/:query # Search companies
GET /api/companies/:id/drivers # Get company drivers
POST /api/companies           # Create company (Admin only)
```

## 📊 Database Schema

### drivers
```sql
id              TEXT PRIMARY KEY
telegram_user_id INTEGER UNIQUE NOT NULL
name            TEXT NOT NULL
status          TEXT (pending|approved|rejected)
company_id      TEXT FOREIGN KEY
created_at      TEXT
updated_at      TEXT
```

### uploads
```sql
id              TEXT PRIMARY KEY
driver_id       TEXT FOREIGN KEY NOT NULL
group_name      TEXT NOT NULL
status          TEXT (pending|approved|rejected)
image_count     INTEGER NOT NULL
created_at      TEXT
updated_at      TEXT
```

### approved_images
```sql
id              TEXT PRIMARY KEY
upload_id       TEXT FOREIGN KEY NOT NULL
message_id      INTEGER NOT NULL (Telegram message ID)
created_at      TEXT
```

### companies
```sql
id              TEXT PRIMARY KEY
name            TEXT UNIQUE NOT NULL
created_at      TEXT
```

## 🔐 Security

- Admin authentication via password (HTTP only cookies, 24h session)
- Telegram user validation (verified via bot)
- Input validation on all endpoints
- Rate limiting optional (can add with express-rate-limit)

## 📝 Example Workflow

1. **Setup:**
   ```bash
   npm install && npm run build && npm start
   ```

2. **Driver uploads images:**
   - Join Telegram group with bot
   - Send 3 photos in group
   - Bot batches them as PENDING

3. **Admin reviews:**
   - Go to http://localhost:3000/admin
   - Login with password
   - Click on pending upload
   - Review images and metadata
   - Click APPROVE

4. **Images forwarded to private channel:**
   - Bot uploads images to private channel
   - Message IDs saved to database
   - Driver status updated to APPROVED

5. **Driver views in public gallery:**
   - Go to http://localhost:3000
   - Search for driver name
   - See approved images gallery

## 🛠️ Development

### Project Structure
- **TypeScript**: Type-safe development
- **Express.js**: Lightweight web framework
- **Telegraf**: Telegram bot library
- **Supabase (Postgres)**: Cloud database via `pg`
- **UUID**: Unique IDs for records

### Adding Features

**New API Endpoint:**
```typescript
// src/routes/myroute.ts
import { Router } from 'express';

const router = Router();

router.get('/', async (req, res) => {
  // Your handler
});

export default router;
```

**New Service:**
```typescript
// src/services/my.service.ts
import { db } from '../storage/database';

export class MyService {
  async getAll() {
    return db.all('SELECT * FROM my_table');
  }
}
```

## 🐛 Troubleshooting

### Bot not receiving images
- Ensure bot is admin in group
- Check BOT_TOKEN is correct
- Bot must have message permission

### Admin panel login fails
- Verify ADMIN_PASSWORD in .env
- Check browser cookies are enabled

### Images not uploading to private channel
- Verify bot is admin in private channel
- Check PRIVATE_CHANNEL_ID format
- Ensure channel is private, not public

### Database errors
- Verify DATABASE_URL is set to your Supabase Postgres connection string
- Check the database password in the connection string is correct
- Tables are created automatically on first start (or run `supabase/schema.sql` in the Supabase SQL editor)

## 📦 Production Deployment

### Using PM2
```bash
npm install -g pm2
npm run build

# Create ecosystem.config.js
pm2 start dist/index.js --name "driver-approval"
pm2 save
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Environment Variables
- Set all variables in `.env` before deployment
- Use different credentials for production

## 📄 License

MIT

## 🤝 Support

For issues or questions, check:
- `.env` configuration is correct
- Telegram bot has required permissions
- Database file is writable
- Port 3000 is not in use

---

**Made with ❤️ for simple, working MVPs**
# check-document-bot

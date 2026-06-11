# 🚀 Quick Start Guide

## 1️⃣ Get Telegram Credentials

### Step 1: Create Bot
1. Open [@BotFather](https://t.me/botfather)
2. Send `/start` then `/newbot`
3. Follow prompts to create bot
4. **Save your BOT_TOKEN**

### Step 2: Create Group
1. Create new group in Telegram
2. Add your bot to group
3. Make it public or private

### Step 3: Create Private Channel
1. Create new channel (private)
2. Add your bot as admin
3. Add yourself to channel

### Step 4: Get IDs
1. Open [@userinfobot](https://t.me/userinfobot)
2. Get your **user ID** (ADMIN_CHAT_ID)
3. In group, send `/start` to bot
4. In channel, send any message
5. Use bot API to get channel ID: `https://api.telegram.org/bot<TOKEN>/getUpdates`

---

## 2️⃣ Setup Project

```bash
# 1. Navigate to project
cd check-document-bot

# 2. Install packages
npm install

# 3. Create .env file
cp .env.example .env

# 4. Edit .env with your values
# BOT_TOKEN = from @BotFather
# ADMIN_CHAT_ID = your user ID
# PRIVATE_CHANNEL_ID = channel ID
# ADMIN_PASSWORD = your choice
```

---

## 3️⃣ Run Project

### Development
```bash
npm run dev
```

Server starts at: `http://localhost:3000`

### Production
```bash
npm run build
npm start
```

---

## 4️⃣ Test Workflow

### Admin Panel
1. Go to `http://localhost:3000/admin`
2. Enter password (default: `admin123`)
3. Dashboard shows pending uploads

### Upload Test
1. Go to your Telegram group
2. Send 2-3 photos (not as album, one by one)
3. Wait 5 seconds (batch time)
4. Admin receives Telegram notification
5. Refresh admin dashboard - upload appears

### Approve Upload
1. Click "View" on upload
2. See driver info and image count
3. Click "Approve"
4. Images upload to private channel
5. Driver status changes to APPROVED

### View Gallery
1. Go to `http://localhost:3000`
2. See list of approved drivers
3. Click driver card to see images
4. Click "Search" to find by name

---

## 5️⃣ Common Issues

| Issue | Solution |
|-------|----------|
| Bot not receiving images | Check bot is admin in group |
| Login fails | Verify ADMIN_PASSWORD in .env |
| Database error | Check DATABASE_URL (Supabase) in .env |
| Port already in use | Change PORT in .env |
| Images not uploading | Verify bot is admin in channel |

---

## 📱 URLs

| Page | URL |
|------|-----|
| Driver Gallery | http://localhost:3000 |
| Admin Login | http://localhost:3000/admin |
| API | http://localhost:3000/api |
| Health Check | http://localhost:3000/health |

---

## 🛠️ Useful Commands

```bash
# Reset database — drop tables in the Supabase SQL editor, e.g.:
#   drop table drivers, uploads, approved_images, companies,
#              settings, telegram_groups, admin_sessions, scheduled_messages;
# (they are re-created automatically on next start)

# Stop bot (Ctrl+C)

# Install new package
npm install package-name

# Type check
npm run type-check
```

---

## 📚 Next Steps

1. ✅ Setup credentials
2. ✅ Run `npm install`
3. ✅ Configure `.env`
4. ✅ Run `npm run dev`
5. ✅ Test workflow
6. ✅ Deploy to production

---

**That's it! Your driver approval bot is ready! 🎉**

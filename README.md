# 🎵 Discord Music Bot

Bot สำหรับเล่นเพลงใน Discord ฟรี 24/7

## ✨ ฟีเจอร์

- 🎵 เล่นเพลงจาก YouTube
- 📝 ระบบ Queue เพลง
- ⏭️ ข้ามเพลง
- ⏹️ หยุดเพลง
- 📋 ดูรายการเพลงใน Queue

## 📦 การติดตั้ง

### 1. สร้าง Discord Bot

1. ไปที่ [Discord Developer Portal](https://discord.com/developers/applications)
2. คลิก "New Application" และตั้งชื่อ bot
3. ไปที่แท็บ "Bot" และคลิก "Add Bot"
4. เปิด "MESSAGE CONTENT INTENT" ใน Privileged Gateway Intents
5. คัดลอก Token ของ bot

### 2. เชิญ Bot เข้า Server

ใช้ URL นี้ (แทน YOUR_CLIENT_ID ด้วย Client ID ของคุณ):
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=3165184&scope=bot
```

### 3. ติดตั้ง Dependencies

```bash
npm install
```

### 4. ตั้งค่า Environment Variables

สร้างไฟล์ `.env`:
```
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
```

### 5. รัน Bot

```bash
npm start
```

## 🎮 คำสั่งใช้งาน (Slash Commands)

พิมพ์ `/` แล้วเลือกคำสั่ง:

- `/play <ชื่อเพลง>` - 🎵 เล่นเพลงหรือเพิ่มเข้า queue
- `/skip` - ⏭️ ข้ามเพลงปัจจุบัน
- `/stop` - ⏹️ หยุดเพลงและออกจาก voice channel
- `/queue` - 📋 ดูรายการเพลงใน queue
- `/nowplaying` - 🎵 ดูเพลงที่กำลังเล่น
- `/pause` - ⏸️ หยุดเพลงชั่วคราว
- `/resume` - ▶️ เล่นเพลงต่อ

**ฟีเจอร์พิเศษ:** มีปุ่มควบคุมเพลง (Pause, Resume, Skip, Stop) ใต้ข้อความเพลง!

## 🔄 วิธีอัพเดตโค้ด

หลัง deploy แล้ว ถ้าต้องการแก้ไขโค้ด:

```bash
git add .
git commit -m "อธิบายว่าแก้อะไร"
git push
```

Railway จะ auto-deploy ให้อัตโนมัติภายใน 1-2 นาที!

## 🚀 Deploy ฟรี 24/7 บน Railway

### ขั้นตอนที่ 1: สร้าง Discord Bot
1. ไปที่ https://discord.com/developers/applications
2. คลิก "New Application" → ตั้งชื่อ bot
3. ไปที่แท็บ "Bot" → คลิก "Add Bot"
4. **สำคัญ!** เปิด "MESSAGE CONTENT INTENT"
5. คลิก "Reset Token" → คัดลอก Token เก็บไว้
6. ไปที่แท็บ "OAuth2" → คัดลอก "CLIENT ID" เก็บไว้

### ขั้นตอนที่ 2: เชิญ Bot เข้า Server
1. ไปที่ "OAuth2" → "URL Generator"
2. เลือก Scopes: `bot`
3. เลือก Permissions: `Connect`, `Speak`, `Send Messages`, `View Channels`
4. คัดลอก URL → เปิดในเบราว์เซอร์ → เลือก Server

### ขั้นตอนที่ 3: อัพโค้ดขึ้น GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/REPO_NAME.git
git push -u origin main
```

### ขั้นตอนที่ 4: Deploy บน Railway
1. ไปที่ https://railway.app/ → Login ด้วย GitHub
2. คลิก "New Project" → "Deploy from GitHub repo"
3. เลือก repo ของคุณ
4. คลิกที่ service → ไปที่แท็บ "Variables"
5. เพิ่ม Variables:
   - `DISCORD_TOKEN` = token ที่คัดลอกไว้
   - `CLIENT_ID` = client id ที่คัดลอกไว้
6. รอ deploy เสร็จ (2-5 นาที)
7. ดู Logs ถ้าเห็น "✅ Bot พร้อมใช้งานแล้ว!" = สำเร็จ!

## ⚠️ หมายเหตุ

- Bot ต้องการ FFmpeg สำหรับเล่นเสียง (ติดตั้งอัตโนมัติผ่าน ffmpeg-static)
- บาง hosting ฟรีอาจมีข้อจำกัดเรื่องเวลาใช้งาน
- สำหรับ Railway และ Render แพลนฟรีมีเวลาใช้งานจำกัดต่อเดือน

## 🛠️ Troubleshooting

หาก bot ไม่สามารถเล่นเพลงได้:
1. ตรวจสอบว่าเปิด "MESSAGE CONTENT INTENT" แล้ว
2. ตรวจสอบว่า bot มี permission เข้า voice channel
3. ลองใช้ URL YouTube โดยตรงแทนการค้นหา

## 📝 License

MIT

# 🔧 แก้ปัญหา Status Code 403

## ปัญหา: YouTube block การดาวน์โหลด

เมื่อเจอ error `Status code: 403` แสดงว่า YouTube block IP ของคุณ

## วิธีแก้:

### วิธีที่ 1: ใช้ YouTube Cookies (แนะนำ)

1. **ติดตั้ง Extension:**
   - Chrome: [Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)
   - Firefox: [cookies.txt](https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/)

2. **Export Cookies:**
   - เปิด YouTube และ login
   - คลิก extension → Export cookies
   - บันทึกเป็น `youtube_cookies.txt`

3. **ใช้ Cookies ใน Bot:**
   
   แก้ไขไฟล์ `index.js` บรรทัดที่มี `ytdl.createAgent`:
   
   ```javascript
   import fs from 'fs';
   
   // อ่าน cookies
   const cookies = fs.readFileSync('./youtube_cookies.txt', 'utf-8');
   
   const agent = ytdl.createAgent(JSON.parse(cookies));
   ```

### วิธีที่ 2: Deploy บน Server

Deploy bot บน Railway/Render เพราะ:
- ✅ IP ของ server ไม่โดน block
- ✅ Bandwidth ดีกว่า
- ✅ ทำงาน 24/7

### วิธีที่ 3: ใช้ Proxy

เพิ่ม proxy ในไฟล์ `.env`:

```
HTTP_PROXY=http://your-proxy:port
HTTPS_PROXY=http://your-proxy:port
```

แล้วแก้โค้ด:

```javascript
const agent = ytdl.createAgent(undefined, {
  localAddress: process.env.HTTP_PROXY
});
```

### วิธีที่ 4: ใช้ VPN

- เปิด VPN บนเครื่อง
- Restart bot
- ลองใหม่

## วิธีชั่วคราว:

ถ้าต้องการทดสอบเร็วๆ:

1. **รอสักครู่** (5-10 นาที) แล้วลองใหม่
2. **Restart Router** เพื่อเปลี่ยน IP
3. **ใช้ Mobile Hotspot** แทน WiFi

## หมายเหตุ:

- ปัญหานี้เกิดจาก YouTube ป้องกันการ scraping
- Bot ที่ใช้งานจริงมักใช้ proxy server หรือ cookies
- Deploy บน server จะแก้ปัญหาได้ดีที่สุด

## ทดสอบว่าแก้ได้หรือยัง:

```bash
npm start
```

แล้วลอง `/play URL` ใน Discord

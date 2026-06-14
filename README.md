# ShopeeClipAI 🛒

ระบบสร้างคลิปปักตะกร้า + แคปชั่น อัตโนมัติ พร้อมระบบ License Key

## ฟีเจอร์
- ✍️ สร้างแคปชั่นจากเทมเพลต หรือให้ AI เขียนให้
- 🎬 สร้างคลิปวิดีโอจากรูปสินค้า (Ken Burns effect) หรืออัปโหลดคลิปที่มีอยู่
- 📲 แชร์วิดีโอ+แคปชั่นไปโพสในแอปต่างๆ ผ่าน Web Share API (ไม่ต้องใช้ API)
- 📅 คิวโพส — วางแผนและเช็กลิสต์การโพส
- 🔑 ระบบ License Key (รายเดือน/รายปี/ตลอดชีพ) + Admin Panel จัดการ Key

---

## ⚠️ สำคัญ: ตั้งค่าฐานข้อมูลกลาง (Supabase) — จำเป็นถ้าขายให้คนจำนวนมาก

หากไม่ตั้งค่า Supabase แอปจะใช้ `localStorage` (เครื่องใครเครื่องมัน — Key ที่ Admin สร้างจะใช้ได้แค่ในเบราว์เซอร์เดียวกัน) สำหรับขายให้ลูกค้าหลายคนใช้งานจากมือถือคนละเครื่อง **ต้องทำตามนี้:**

### 1. สร้างโปรเจกต์ Supabase (ฟรี)
1. ไปที่ https://supabase.com → สมัครสมาชิก → New Project
2. รอสักครู่จนโปรเจกต์พร้อม

### 2. สร้างตารางฐานข้อมูล
1. ในเมนูซ้าย เลือก **SQL Editor** → New Query
2. คัดลอกเนื้อหาทั้งหมดจากไฟล์ `supabase-schema.sql` ในโฟลเดอร์นี้ → วาง → กด **Run**
3. จะได้ตาราง `license_keys` และ `post_queue` พร้อมใช้งาน

### 3. คัดลอก API Key
1. ไปที่ **Settings → API**
2. คัดลอก **Project URL** และ **anon public key**

### 4. ใส่ค่าในโปรเจกต์
1. คัดลอกไฟล์ `.env.example` เป็น `.env`
2. แก้ค่า:
```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxxxxxxxxxxxxxxxxxxxxx
```

### 5. ตั้งค่าบน Vercel/Netlify
ตอน deploy ให้เพิ่ม Environment Variables ในหน้า Settings ของ Vercel/Netlify:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

จากนั้น Key ที่ Admin สร้างจะใช้งานได้จากมือถือทุกเครื่องทันที ✅

---



### 1. ติดตั้งและรันทดสอบในเครื่อง (ไม่บังคับ)
```bash
npm install
npm run dev
```

### 2. Deploy บน Vercel
1. สร้างบัญชีที่ https://vercel.com (สมัครด้วย GitHub ก็ได้)
2. อัปโหลดโฟลเดอร์นี้ขึ้น GitHub repo ใหม่ (หรือลาก-วางทั้งโฟลเดอร์ผ่าน Vercel CLI/Dashboard)
3. ใน Vercel: New Project → เลือก repo → Framework Preset เลือก **Vite** → Deploy
4. รอ 1-2 นาที จะได้ URL เช่น `https://shopeeclip-ai.vercel.app`

### หรือ Deploy บน Netlify
1. สร้างบัญชีที่ https://netlify.com
2. ลากโฟลเดอร์ทั้งหมด (หลัง `npm run build` จะได้โฟลเดอร์ `dist`) ไปวางที่หน้า Netlify Drop
3. หรือเชื่อม GitHub repo แล้วตั้ง Build command = `npm run build`, Publish directory = `dist`

---

## วิธีติดตั้งเป็นแอปบนมือถือ (PWA)
1. เปิด URL ที่ deploy แล้วด้วย **Chrome บน Android** หรือ **Safari บน iOS**
2. Android (Chrome): กดเมนู ⋮ → "เพิ่มไปยังหน้าจอหลัก" (Add to Home screen)
3. iOS (Safari): กดปุ่มแชร์ 📤 → "เพิ่มไปยังหน้าจอหลัก"
4. จะได้ไอคอนแอป ShopeeClipAI บนหน้าจอ เปิดใช้งานแบบเต็มจอเหมือนแอปจริง

---

## การตั้งค่าเริ่มต้น

### เปลี่ยนรหัส Admin
แก้ไฟล์ `src/App.jsx` บรรทัดนี้:
```js
const ADMIN_PASSWORD = "admin1234";
```
เปลี่ยนเป็นรหัสที่ปลอดภัยก่อน deploy จริง

### ตั้งค่า AI (สำหรับฟีเจอร์สร้างแคปชั่น/สคริปต์ด้วย AI)
ในแอป กดปุ่ม **⚙️ ตั้งค่า AI** ที่หน้าแรก แล้วกรอก Anthropic API Key
- รับ API Key ได้ที่ https://console.anthropic.com
- Key จะถูกเก็บไว้ในเครื่อง (localStorage) ของผู้ใช้แต่ละคนเท่านั้น
- หากไม่ตั้งค่า ฟีเจอร์เทมเพลตแคปชั่นยังใช้งานได้ปกติ (ไม่ต้องใช้ AI)

---

## โครงสร้างไฟล์
```
shopeeclip/
├── index.html
├── package.json
├── vite.config.js
├── public/
│   ├── favicon.svg
│   ├── icon-192.png
│   └── icon-512.png
└── src/
    ├── main.jsx
    ├── index.css
    └── App.jsx       ← โค้ดหลักทั้งหมดอยู่ที่นี่
```

## License Key & Admin
- เข้าหน้า Admin: กดแท็บ "⚙️ Admin" หน้า Login → กรอกรหัส Admin
- สร้าง Key ใหม่ได้ไม่จำกัด เลือกประเภท รายเดือน/รายปี/ตลอดชีพ
- ถ้าตั้งค่า Supabase แล้ว (ดูหัวข้อด้านบน) Key จะใช้งานได้จากทุกอุปกรณ์/มือถือทุกเครื่องทันที
- ถ้าไม่ตั้งค่า Supabase จะใช้ localStorage (เครื่องใครเครื่องมัน — ไม่เหมาะกับการขายจำนวนมาก)

---

## หมายเหตุสำคัญ
- การ "แชร์ไปโพส" ใช้ Web Share API ของเบราว์เซอร์ ทำงานดีบน Android/Chrome
- การโพสขึ้น Shopee/TikTok/Facebook แบบอัตโนมัติเต็มรูปแบบ (ไม่ผ่านการกดเลือกแอป) ต้องใช้ API ทางการของแต่ละแพลตฟอร์ม ซึ่งต้องลงทะเบียนนักพัฒนาแยกต่างหาก

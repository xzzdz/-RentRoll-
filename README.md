# ระบบจัดการหอพัก (dorm-manager)

Next.js 15 (App Router) + TypeScript · PostgreSQL + Prisma 6 · Tailwind CSS 4 · shadcn/ui

## เริ่มใช้งาน (Windows / PowerShell)

ต้องมี **Node.js 20+** และ **Docker Desktop** (หรือ PostgreSQL ที่ติดตั้งเอง)

```powershell
cd D:\Project\dorm-manager

# 0) สร้างไฟล์ .env แล้วสุ่มค่า AUTH_SECRET, ENCRYPTION_KEY, CRON_SECRET (รันคำสั่งนี้ 3 ครั้ง)
copy .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 1) ฐานข้อมูล (ข้ามได้ถ้ามี PostgreSQL อยู่แล้ว — แก้ DATABASE_URL ใน .env)
docker compose up -d

# 2) ติดตั้งแพ็กเกจ (จะรัน prisma generate ให้อัตโนมัติ)
npm install

# 3) สร้างตาราง + ข้อมูลตัวอย่าง
npx prisma migrate dev --name init
npm run db:seed

# 4) รัน
npm run dev
```

เปิด http://localhost:3000

| บัญชี | ล็อกอิน | รหัสผ่าน |
|---|---|---|
| เจ้าของ | owner@dorm.local | changeme123 |
| ช่าง | 0800000001 | changeme123 |

> ตอนขึ้น production ให้สุ่ม `AUTH_SECRET` ใหม่และเปลี่ยนรหัสผ่านเริ่มต้น

## ทำแล้ว

**เฟส 1**
- ล็อกอินเจ้าของ/ช่าง (session cookie เซ็นด้วย JWT, middleware กันหน้า)
- ภาพรวม · ผังห้อง · จดมิเตอร์ (บันทึกทันที, คำนวณยอดสด, เก็บประวัติแก้ไข) · ตั้งค่า

**เฟส 2**
- **shadcn/ui** — `components.json` ตั้งค่าแล้ว เพิ่ม component ได้ด้วย `npx shadcn@latest add <ชื่อ>`
- **ผู้เช่า & สัญญา** — รายการ/ค้นหา, ทำสัญญาใหม่ (ข้อมูลผู้เช่า, ค่าเช่า/ประกัน, ค่าบริการ, จดมิเตอร์ตั้งต้น), หน้ารายละเอียดห้อง, ย้ายออก (จดมิเตอร์วันออก + คืนประกัน), เปลี่ยนสถานะห้องว่าง/จอง/ปิดปรับปรุง · เลขบัตรประชาชนเข้ารหัส AES-256-GCM
- **บิล & ใบเสร็จ** — สร้าง/อัปเดตบิลร่างทั้งรอบ (ค่าเช่าคิดตามวันเมื่อเข้า/ออกกลางเดือน, ค่าซ่อมที่เรียกเก็บผู้เช่า), ส่งบิล, บันทึกรับเงิน (รับบางส่วนได้) + ออกใบเสร็จเลขรันต่อเนื่อง, คิดค่าปรับ, ยกเลิกบิล, หน้าพิมพ์ใบแจ้งหนี้/ใบเสร็จ A4 (บันทึกเป็น PDF จากหน้าต่างพิมพ์)
- **Cron รายวัน** `GET /api/cron/billing` (header `Authorization: Bearer <CRON_SECRET>`) — สร้างบิลร่างวันที่ตั้งไว้, ส่งบิลอัตโนมัติ (ถ้าเปิด), ปรับบิลเลยกำหนด + ค่าปรับ

ตั้งเวลาเรียก cron บน Windows (Task Scheduler) ด้วยคำสั่ง:

```powershell
curl.exe -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/billing
```

## ต่อไป

1. แจ้งซ่อม (เจ้าของมอบงาน, ช่างอัปเดตสถานะ/ปิดงาน/ใส่ค่าใช้จ่าย)
2. LINE LIFF ผู้เช่า + LINE Login + แจ้งเตือนบิล
3. PromptPay QR + ตรวจสลิป
4. PDF ฝั่ง server (สำหรับส่งทาง LINE)

## โครงสร้าง

```
prisma/schema.prisma      ตารางทั้งหมด (ตึก ห้อง สัญญา มิเตอร์ บิล ใบเสร็จ แจ้งซ่อม ตั้งค่า)
prisma/seed.ts            ข้อมูลตัวอย่าง 3 ตึก 132 ห้อง
src/lib/billing.ts        กติกาคำนวณบิล (pure — ใช้ทั้ง server และ client)
src/lib/format.ts         วันที่ พ.ศ. / จำนวนเงิน / บาทเป็นตัวอักษร
src/lib/meters.ts         ดึงเลขมิเตอร์ครั้งก่อน-ครั้งนี้
src/lib/invoice.ts        สร้างบิลร่าง / ส่งบิล / รับชำระ / ค่าปรับ / ยกเลิก
src/components/ui         shadcn/ui components
src/app/(owner)/...       หน้าเจ้าของ: dashboard, rooms, tenants, contracts, meters, billing, settings
src/app/print             หน้าพิมพ์ใบแจ้งหนี้/ใบเสร็จ
src/app/api/cron/billing  งานรายวัน
src/app/tech              หน้าช่าง
src/middleware.ts         กันหน้าตาม role
```

คำสั่งที่ใช้บ่อย: `npm run db:studio` (ดู/แก้ข้อมูล), `npx prisma migrate reset` (ล้างแล้ว seed ใหม่), `npm run typecheck`

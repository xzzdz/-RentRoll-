/**
 * ข้อมูลเริ่มต้น: หอ 1 แห่ง 3 ตึก พร้อมห้อง มิเตอร์ ผู้เช่าตัวอย่าง และบัญชีเจ้าของ/ช่าง
 * รัน: npm run db:seed   (รันซ้ำได้ — ถ้ามีข้อมูลหอแล้วจะข้าม)
 */
import { PrismaClient, type RoomStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// เดือนรอบบิลปัจจุบัน (เวลาไทย) และเดือนก่อนหน้า
const bkk = new Date(Date.now() + 7 * 3600_000);
const period = new Date(Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth(), 1));
const prevPeriod = new Date(Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth() - 1, 1));

// สุ่มแบบกำหนด seed เพื่อให้ได้ข้อมูลเหมือนเดิมทุกครั้ง
let seed = 2569;
const rnd = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const ri = (a: number, b: number) => Math.floor(rnd() * (b - a + 1)) + a;
const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];

const FIRST = ["สมชาย", "สุดา", "ณัฐพล", "พิมพ์ชนก", "ธนากร", "กมลวรรณ", "อรุณ", "ศิริพร", "วีระ", "ปวีณา", "ภาณุ", "จิราพร", "ธีรเดช", "นภัสสร", "กิตติ", "อนุชา", "รัตนา", "ชยพล"];
const LAST = ["ใจดี", "ศรีสุข", "วงศ์ทอง", "แก้วมณี", "บุญมา", "สายสุวรรณ", "ทองดี", "รุ่งเรือง", "พึ่งบุญ", "มีสุข"];

async function main() {
  if (await db.property.findFirst()) {
    console.log("มีข้อมูลหอแล้ว — ข้าม seed (ถ้าต้องการเริ่มใหม่: npx prisma migrate reset)");
    return;
  }

  // ---------- users ----------
  const owner = await db.user.create({
    data: {
      role: "OWNER",
      name: "เจ้าของหอ",
      email: process.env.SEED_OWNER_EMAIL ?? "owner@dorm.local",
      passwordHash: await bcrypt.hash(process.env.SEED_OWNER_PASSWORD ?? "changeme123", 10),
    },
  });
  const tech = await db.user.create({
    data: {
      role: "TECHNICIAN",
      name: "ช่างสมชาย",
      phone: process.env.SEED_TECH_PHONE ?? "0800000001",
      passwordHash: await bcrypt.hash(process.env.SEED_TECH_PASSWORD ?? "changeme123", 10),
    },
  });

  // ---------- property & settings ----------
  const property = await db.property.create({
    data: {
      name: "บ้านสบาย เรสซิเดนซ์",
      address: "99/9 ซ.ตัวอย่าง แขวงลาดยาว เขตจตุจักร กรุงเทพฯ 10900",
      phone: "02-000-0000",
      billingSetting: {
        create: { billingDay: 25, issueDay: 1, dueDay: 5, lateFeeMode: "PER_DAY", lateFeeAmount: 50, lateFeeMax: 500, promptPayId: "0812345678" },
      },
      utilityRates: {
        create: [
          { utility: "WATER", mode: "PER_UNIT", unitPrice: 18, minimumCharge: 100, effectiveFrom: prevPeriod },
          { utility: "ELECTRIC", mode: "PER_UNIT", unitPrice: 8, effectiveFrom: prevPeriod },
        ],
      },
      feeItems: {
        create: [
          { name: "ค่าส่วนกลาง", amount: 300, isDefault: true },
          { name: "ค่าอินเทอร์เน็ต", amount: 200, isDefault: true },
          { name: "ค่าที่จอดรถ", amount: 500, isDefault: false },
        ],
      },
    },
    include: { feeItems: true },
  });
  const defaultFees = property.feeItems.filter((f) => f.isDefault);

  const [fan, air, studio] = await Promise.all([
    db.roomType.create({ data: { propertyId: property.id, name: "ห้องพัดลม", baseRent: 3500, deposit: 7000 } }),
    db.roomType.create({ data: { propertyId: property.id, name: "ห้องแอร์", baseRent: 4500, deposit: 9000 } }),
    db.roomType.create({ data: { propertyId: property.id, name: "สตูดิโอ", baseRent: 6500, deposit: 13000 } }),
  ]);

  // ---------- buildings, rooms, meters, tenants ----------
  const layout = [
    { name: "ตึก A", code: "A", floors: 5, perFloor: 10 },
    { name: "ตึก B", code: "B", floors: 5, perFloor: 10 },
    { name: "ตึก C", code: "C", floors: 4, perFloor: 8 },
  ];
  let contractNo = 0;

  for (const [i, b] of layout.entries()) {
    const building = await db.building.create({ data: { propertyId: property.id, name: b.name, floors: b.floors, sortOrder: i } });
    await db.technicianBuilding.create({ data: { userId: tech.id, buildingId: building.id } });

    for (let f = 1; f <= b.floors; f++) {
      for (let n = 1; n <= b.perFloor; n++) {
        const type = f === b.floors && b.code !== "C" ? studio : b.code === "C" && n <= 3 ? fan : rnd() < 0.25 ? fan : air;
        const r = rnd();
        const status: RoomStatus = r < 0.84 ? "OCCUPIED" : r < 0.94 ? "VACANT" : r < 0.97 ? "RESERVED" : "MAINTENANCE";

        const room = await db.room.create({
          data: {
            buildingId: building.id,
            roomTypeId: type.id,
            number: `${b.code}-${f}${String(n).padStart(2, "0")}`,
            floor: f,
            status,
            meters: {
              create: [
                { utility: "WATER", maxReading: 9999 },
                { utility: "ELECTRIC", maxReading: 99999 },
              ],
            },
          },
          include: { meters: true },
        });

        if (status !== "OCCUPIED") continue;

        const start = new Date(Date.UTC(period.getUTCFullYear(), period.getUTCMonth() - ri(1, 14), ri(1, 28)));
        const end = new Date(Date.UTC(start.getUTCFullYear() + 1, start.getUTCMonth(), start.getUTCDate()));
        const tenant = await db.tenant.create({
          data: {
            fullName: `${pick(FIRST)} ${pick(LAST)}`,
            phone: `08${ri(1, 9)}${ri(1000000, 9999999)}`,
            inviteCode: `INV${room.number.replace("-", "")}${ri(100, 999)}`,
          },
        });
        await db.contract.create({
          data: {
            contractNo: `CT-${String(++contractNo).padStart(4, "0")}`,
            roomId: room.id,
            status: "ACTIVE",
            startDate: start,
            endDate: end,
            monthlyRent: type.baseRent,
            depositAmount: type.deposit,
            tenants: { create: { tenantId: tenant.id, isPrimary: true } },
            fees: { create: defaultFees.map((fee) => ({ feeItemId: fee.id })) },
          },
        });

        // เลขมิเตอร์เดือนก่อน (ถือเป็นเลขตั้งต้นของรอบนี้) — ~70% ของห้องจดเดือนนี้ไปแล้ว
        const water = room.meters.find((m) => m.utility === "WATER")!;
        const elec = room.meters.find((m) => m.utility === "ELECTRIC")!;
        const w0 = ri(80, 900);
        const e0 = ri(1200, 9000);
        await db.meterReading.createMany({
          data: [
            { meterId: water.id, periodMonth: prevPeriod, value: w0, isInitial: true, readById: owner.id },
            { meterId: elec.id, periodMonth: prevPeriod, value: e0, isInitial: true, readById: owner.id },
          ],
        });
        if (rnd() < 0.7) {
          const eUse = type.id === fan.id ? ri(40, 110) : ri(110, 320);
          await db.meterReading.createMany({
            data: [
              { meterId: water.id, periodMonth: period, value: w0 + ri(3, 14), readById: owner.id },
              { meterId: elec.id, periodMonth: period, value: e0 + eUse, readById: owner.id },
            ],
          });
        }
      }
    }
  }

  // ---------- งานซ่อมตัวอย่าง ----------
  const someRooms = await db.room.findMany({ where: { status: "OCCUPIED" }, take: 4, orderBy: { number: "asc" } });
  const jobs = [
    { category: "แอร์", title: "แอร์ไม่เย็น มีน้ำหยด", priority: "NORMAL", status: "ASSIGNED" },
    { category: "ประปา", title: "ชักโครกกดไม่ลง", priority: "URGENT", status: "IN_PROGRESS" },
    { category: "ไฟฟ้า", title: "ปลั๊กห้องน้ำไม่มีไฟ", priority: "URGENT", status: "NEW" },
    { category: "เฟอร์นิเจอร์", title: "บานพับตู้เสื้อผ้าหลุด", priority: "LOW", status: "NEW" },
  ] as const;
  for (const [i, j] of jobs.entries()) {
    const room = someRooms[i];
    if (!room) break;
    await db.maintenanceRequest.create({
      data: {
        ticketNo: `MT-${period.getUTCFullYear()}${String(period.getUTCMonth() + 1).padStart(2, "0")}-${String(i + 1).padStart(4, "0")}`,
        roomId: room.id,
        category: j.category,
        title: j.title,
        priority: j.priority,
        status: j.status,
        assignedToId: j.status === "NEW" ? null : tech.id,
        preferredTime: "ช่วงเย็นหลัง 17:00",
      },
    });
  }

  // กันเลขที่เอกสารชนกับที่ seed สร้างไว้
  await db.documentSequence.create({
    data: {
      propertyId: property.id,
      docType: "MAINTENANCE",
      period: `${period.getUTCFullYear()}${String(period.getUTCMonth() + 1).padStart(2, "0")}`,
      prefix: "MT",
      lastNo: jobs.length,
    },
  });

  const rooms = await db.room.count();
  const contracts = await db.contract.count();
  console.log(`✔ seed เสร็จ: ${rooms} ห้อง · ${contracts} สัญญา`);
  console.log(`  เจ้าของ: ${owner.email} / ${process.env.SEED_OWNER_PASSWORD ?? "changeme123"}`);
  console.log(`  ช่าง:    ${tech.phone} / ${process.env.SEED_TECH_PASSWORD ?? "changeme123"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

// แจ้งเตือนที่ระบบสร้างเอง — ตอนนี้ลงเป็น IN_APP ไว้ก่อน
// พอต่อ LINE แล้วค่อยอ่านแถวที่ยัง QUEUED ไปส่งต่อ
import { db } from "./db";
import { thDate } from "./format";

/**
 * หาสัญญาที่จะหมดอายุภายใน days วัน แล้วแจ้งเจ้าของ
 * แจ้งสัญญาละครั้งเดียว (เช็กจาก payload.contractId) เรียกซ้ำทุกวันได้ไม่สร้างซ้ำ
 */
export async function notifyExpiringContracts(propertyId: string, days: number, today: Date) {
  const until = new Date(today.getTime() + days * 86_400_000);

  const [contracts, owners] = await Promise.all([
    db.contract.findMany({
      where: { status: "ACTIVE", room: { building: { propertyId } }, endDate: { gte: today, lte: until } },
      orderBy: { endDate: "asc" },
      include: { room: { select: { number: true } }, tenants: { where: { isPrimary: true }, include: { tenant: true } } },
    }),
    db.user.findMany({ where: { role: "OWNER", isActive: true }, select: { id: true } }),
  ]);
  if (contracts.length === 0 || owners.length === 0) return { checked: contracts.length, created: 0 };

  let created = 0;
  for (const c of contracts) {
    const left = Math.round((c.endDate!.getTime() - today.getTime()) / 86_400_000);
    const tenant = c.tenants[0]?.tenant.fullName ?? "ไม่ระบุผู้เช่า";

    for (const o of owners) {
      const already = await db.notification.findFirst({
        where: { userId: o.id, type: "CONTRACT_EXPIRING", payload: { path: ["contractId"], equals: c.id } },
        select: { id: true },
      });
      if (already) continue;

      await db.notification.create({
        data: {
          userId: o.id,
          channel: "IN_APP",
          type: "CONTRACT_EXPIRING",
          title: `สัญญาห้อง ${c.room.number} ใกล้หมดอายุ`,
          body: `${tenant} · หมดอายุ ${thDate(c.endDate!)} (อีก ${left} วัน) — ติดต่อผู้เช่าเพื่อต่อสัญญาหรือเตรียมปล่อยห้อง`,
          payload: { contractId: c.id, roomNumber: c.room.number, endDate: c.endDate!.toISOString().slice(0, 10) },
          status: "QUEUED",
        },
      });
      created++;
    }
  }
  return { checked: contracts.length, created };
}

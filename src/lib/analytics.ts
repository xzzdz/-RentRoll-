// ตัวเลขสรุปสำหรับหน้าภาพรวม — รวมเป็นรายเดือนเพื่อทำกราฟย้อนหลัง
import { db } from "./db";
import { addMonths } from "./period";
import { round2 } from "./billing";

export type MonthPoint = {
  period: Date;
  billed: number; // ยอดที่ออกบิลไปทั้งหมด (ไม่รวมบิลที่ยกเลิก)
  collected: number; // เก็บได้จริง
  outstanding: number; // ที่เหลือค้าง
  occupied: number; // ห้องที่มีคนอยู่ในเดือนนั้น
  water: number; // หน่วยน้ำรวม
  electric: number; // หน่วยไฟรวม
};

/** ย้อนหลัง n เดือนนับจาก period (รวม period ด้วย) */
export function monthsBack(period: Date, n: number): Date[] {
  return Array.from({ length: n }, (_, i) => addMonths(period, i - (n - 1)));
}

export async function monthlySeries(propertyId: string, periods: Date[]): Promise<MonthPoint[]> {
  if (periods.length === 0) return [];
  const from = periods[0];
  const to = addMonths(periods[periods.length - 1], 1);

  const [invoices, contracts, totalRooms] = await Promise.all([
    db.invoice.findMany({
      where: {
        status: { not: "VOID" },
        contract: { room: { building: { propertyId } } },
        period: { is: { periodMonth: { gte: from, lt: to } } },
      },
      select: {
        total: true,
        paidAmount: true,
        period: { select: { periodMonth: true } },
        items: { where: { type: { in: ["WATER", "ELECTRIC"] } }, select: { type: true, quantity: true } },
      },
    }),
    db.contract.findMany({
      where: { room: { building: { propertyId } }, startDate: { lt: to } },
      select: { startDate: true, moveOutDate: true, endDate: true, status: true },
    }),
    db.room.count({ where: { building: { propertyId } } }),
  ]);

  return periods.map((p) => {
    const next = addMonths(p, 1);
    const inMonth = invoices.filter((i) => i.period && i.period.periodMonth.getTime() === p.getTime());

    const billed = round2(inMonth.reduce((s, i) => s + i.total.toNumber(), 0));
    const collected = round2(inMonth.reduce((s, i) => s + i.paidAmount.toNumber(), 0));
    const units = (t: "WATER" | "ELECTRIC") =>
      round2(inMonth.reduce((s, i) => s + i.items.filter((x) => x.type === t).reduce((a, x) => a + x.quantity.toNumber(), 0), 0));

    // สัญญาที่ครอบคลุมเดือนนี้ = เริ่มก่อนสิ้นเดือน และยังไม่ย้ายออกก่อนต้นเดือน
    const occupied = contracts.filter((c) => {
      if (c.startDate >= next) return false;
      const left = c.moveOutDate ?? (c.status === "ACTIVE" ? null : c.endDate);
      return !left || left >= p;
    }).length;

    return { period: p, billed, collected, outstanding: round2(billed - collected), occupied, water: units("WATER"), electric: units("ELECTRIC") };
  }).map((m) => ({ ...m, occupied: Math.min(m.occupied, totalRooms) }));
}

export async function roomTotals(propertyId: string) {
  const [total, occupied, vacant] = await Promise.all([
    db.room.count({ where: { building: { propertyId } } }),
    db.room.count({ where: { building: { propertyId }, status: "OCCUPIED" } }),
    db.room.count({ where: { building: { propertyId }, status: "VACANT" } }),
  ]);
  return { total, occupied, vacant };
}

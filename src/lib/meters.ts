import type { MeterReading, UtilityType } from "@prisma/client";
import { db } from "./db";
import { sameDay } from "./period";

export type MeterCell = {
  meterId: string;
  prev: number | null; // เลขครั้งก่อน (รวมเลขตั้งต้นตอนทำสัญญา)
  curr: number | null; // เลขรอบนี้
  currId: string | null;
  maxReading: number | null;
};

export type MeterRow = {
  roomId: string;
  contractId: string;
  number: string;
  floor: number;
  roomTypeName: string;
  tenantName: string;
  rent: number;
  fees: { name: string; amount: number }[];
  water: MeterCell | null;
  electric: MeterCell | null;
};

/** include สำหรับดึงเลขมิเตอร์ที่ใช้คำนวณรอบ period */
export const readingsInclude = (period: Date) => ({
  where: { isActive: true },
  include: {
    // เดือนเดียวกันอาจมีทั้งเลขตั้งต้น (ย้ายเข้ากลางเดือน) และเลขรายเดือน จึงดึงมา 3 แถว
    readings: {
      where: { periodMonth: { lte: period } },
      orderBy: [{ periodMonth: "desc" as const }, { isInitial: "asc" as const }],
      take: 3,
    },
  },
});

/** แยกเลขครั้งนี้ (รายเดือนของ period) กับเลขครั้งก่อน (แถวถัดไป) */
export function pickReadings(
  meter: { id: string; utility: UtilityType; maxReading: { toNumber(): number } | null; readings: MeterReading[] },
  period: Date,
): MeterCell {
  const current = meter.readings.find((r) => sameDay(r.periodMonth, period) && !r.isInitial);
  const previous = meter.readings.find((r) => r !== current);
  return {
    meterId: meter.id,
    prev: previous ? previous.value.toNumber() : null,
    curr: current ? current.value.toNumber() : null,
    currId: current?.id ?? null,
    maxReading: meter.maxReading ? meter.maxReading.toNumber() : null,
  };
}

/** ห้องที่มีสัญญา ACTIVE ในตึก พร้อมเลขมิเตอร์ครั้งก่อน/ครั้งนี้ ของรอบบิล period */
export async function getMeterRows(buildingId: string, period: Date): Promise<MeterRow[]> {
  const rooms = await db.room.findMany({
    where: { buildingId, contracts: { some: { status: "ACTIVE" } } },
    orderBy: [{ floor: "asc" }, { number: "asc" }],
    include: {
      roomType: true,
      meters: readingsInclude(period),
      contracts: {
        where: { status: "ACTIVE" },
        take: 1,
        include: {
          tenants: { where: { isPrimary: true }, include: { tenant: true } },
          fees: { include: { feeItem: true } },
        },
      },
    },
  });

  return rooms.map((room) => {
    const c = room.contracts[0];
    const cell = (u: UtilityType) => {
      const m = room.meters.find((x) => x.utility === u);
      return m ? pickReadings(m, period) : null;
    };
    return {
      roomId: room.id,
      contractId: c.id,
      number: room.number,
      floor: room.floor,
      roomTypeName: room.roomType.name,
      tenantName: c.tenants[0]?.tenant.fullName ?? "-",
      rent: c.monthlyRent.toNumber(),
      fees: c.fees
        .filter((f) => f.feeItem.isActive && f.feeItem.charge === "MONTHLY")
        .map((f) => ({ name: f.feeItem.name, amount: (f.amount ?? f.feeItem.amount).toNumber() })),
      water: cell("WATER"),
      electric: cell("ELECTRIC"),
    };
  });
}

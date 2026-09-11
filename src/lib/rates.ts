import type { Prisma, UtilityType } from "@prisma/client";
import { db } from "./db";
import type { RateConfig } from "./billing";

type RateWithTiers = Prisma.UtilityRateGetPayload<{ include: { tiers: true } }>;

const num = (d: Prisma.Decimal | null | undefined) => (d == null ? null : d.toNumber());

export function toRateConfig(r: RateWithTiers | null | undefined): RateConfig | null {
  if (!r) return null;
  return {
    mode: r.mode,
    unitPrice: num(r.unitPrice),
    minimumUnits: num(r.minimumUnits),
    minimumCharge: num(r.minimumCharge),
    flatAmount: num(r.flatAmount),
    tiers: r.tiers.map((t) => ({ fromUnit: t.fromUnit.toNumber(), toUnit: num(t.toUnit), unitPrice: t.unitPrice.toNumber() })),
  };
}

/**
 * อัตราที่มีผล ณ รอบบิล — ถ้ามีอัตราเฉพาะตึกจะใช้ก่อน ไม่งั้นใช้ของทั้งหอ
 * buildingId = undefined → เอาเฉพาะอัตราทั้งหอ (ใช้ในหน้าตั้งค่า)
 */
export async function getRates(propertyId: string, period: Date, buildingId?: string) {
  const rates = await db.utilityRate.findMany({
    where: {
      propertyId,
      effectiveFrom: { lte: period },
      ...(buildingId ? { OR: [{ buildingId: null }, { buildingId }] } : { buildingId: null }),
    },
    include: { tiers: true },
    orderBy: { effectiveFrom: "desc" },
  });
  const pick = (u: UtilityType) =>
    (buildingId ? rates.find((r) => r.utility === u && r.buildingId === buildingId) : undefined) ??
    rates.find((r) => r.utility === u && r.buildingId === null);

  const waterRow = pick("WATER");
  const electricRow = pick("ELECTRIC");
  return {
    water: toRateConfig(waterRow),
    electric: toRateConfig(electricRow),
    rows: { water: waterRow ?? null, electric: electricRow ?? null },
  };
}

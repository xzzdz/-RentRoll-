"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { periodOf } from "@/lib/period";

export type SaveResult = { ok: true } | { ok: false; error: string };

/** บันทึก/แก้ไข/ลบเลขมิเตอร์รอบปัจจุบัน — ทุกการแก้ไขเก็บใน AuditLog */
export async function saveReading(meterId: string, value: number | null): Promise<SaveResult> {
  const session = await requireRole("OWNER");
  const period = periodOf();
  const key = { meterId_periodMonth_isInitial: { meterId, periodMonth: period, isInitial: false } };

  const meter = await db.meter.findUnique({ where: { id: meterId }, select: { isActive: true } });
  if (!meter?.isActive) return { ok: false, error: "ไม่พบมิเตอร์" };

  const existing = await db.meterReading.findUnique({ where: key });

  if (value === null) {
    if (existing) {
      await db.$transaction([
        db.meterReading.delete({ where: key }),
        db.auditLog.create({
          data: { userId: session.userId, entity: "MeterReading", entityId: existing.id, action: "DELETE", before: { value: existing.value.toNumber() } },
        }),
      ]);
    }
    return { ok: true };
  }

  if (!Number.isFinite(value) || value < 0) return { ok: false, error: "เลขมิเตอร์ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป" };

  if (existing && existing.value.toNumber() === value) return { ok: true };

  await db.$transaction(async (tx) => {
    const saved = await tx.meterReading.upsert({
      where: key,
      create: { meterId, periodMonth: period, value, readById: session.userId },
      update: { value, editedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        userId: session.userId,
        entity: "MeterReading",
        entityId: saved.id,
        action: existing ? "UPDATE" : "CREATE",
        before: existing ? { value: existing.value.toNumber() } : undefined,
        after: { value },
      },
    });
  });

  return { ok: true };
}

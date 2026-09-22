"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { assertMeterInScope, ScopeError } from "@/lib/scope";
import { periodOf } from "@/lib/period";

export type SaveResult = { ok: true } | { ok: false; error: string };

/** บันทึก/แก้ไข/ลบเลขมิเตอร์รอบปัจจุบัน — ทุกการแก้ไขเก็บใน AuditLog */
export async function saveReading(meterId: string, value: number | null): Promise<SaveResult> {
  const session = await requireRole("OWNER");
  const period = periodOf();
  const key = { meterId_periodMonth_isInitial: { meterId, periodMonth: period, isInitial: false } };

  // มิเตอร์ต้องอยู่ในหอของผู้ใช้จริง ไม่งั้นยิง meterId ข้ามหอมาเขียนเลขทับได้
  // ตรงนี้คืน error กลับไปให้ช่องกรอก ไม่โยนทิ้ง เพราะหน้าจดมิเตอร์บันทึกทีละช่องแบบไม่รีโหลด
  let meter;
  try {
    ({ meter } = await assertMeterInScope(meterId));
  } catch (e) {
    if (e instanceof ScopeError) return { ok: false, error: e.message };
    throw e;
  }
  if (!meter.isActive) return { ok: false, error: "ไม่พบมิเตอร์" };

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

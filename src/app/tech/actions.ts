"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { withFlash } from "@/lib/flash";
import { db } from "@/lib/db";
import { changeStatus, MaintenanceError } from "@/lib/maintenance";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** เจ้าของเปิดหน้าช่างได้ด้วย — ใช้สิทธิ์ตามบทบาทจริงเพื่อให้ช่างแตะได้เฉพาะงานของตัวเอง */
async function actor(requestId: string) {
  const s = await requireRole("TECHNICIAN", "OWNER");
  // งานที่อ้างถึงต้องอยู่ในหอเดียวกับบัญชี ไม่งั้นยิง id ข้ามหอมาแก้ได้
  const found = await db.maintenanceRequest.findFirst({
    where: { id: requestId, room: { building: { propertyId: s.propertyId } } },
    select: { id: true },
  });
  if (!found) throw new MaintenanceError("ไม่พบงานซ่อมนี้ในหอของคุณ");
  return { userId: s.userId, actorRole: s.role === "OWNER" ? ("OWNER" as const) : ("TECHNICIAN" as const) };
}

export async function startJobAction(f: FormData) {
  const requestId = str(f, "requestId");
  const { userId, actorRole } = await actor(requestId);
  try {
    await changeStatus({ requestId, to: "IN_PROGRESS", userId, actorRole, comment: "เริ่มซ่อม" });
  } catch (e) {
    if (e instanceof MaintenanceError) redirect(withFlash(`/tech/${requestId}`, "err", e.message));
    throw e;
  }
  revalidatePath("/tech");
  revalidatePath("/maintenance");
  redirect(withFlash(`/tech/${requestId}`, "ok", "เริ่มซ่อมแล้ว"));
}

export type TechFormState = { error?: string } | undefined;

/** ช่างปิดงาน + ใส่ค่าใช้จ่าย — การตัดสินใจเรียกเก็บผู้เช่าเป็นของเจ้าของ */
export async function completeJobAction(_prev: TechFormState, f: FormData): Promise<TechFormState> {
  const requestId = str(f, "requestId");
  const { userId, actorRole } = await actor(requestId);
  const raw = str(f, "cost");
  const cost = raw === "" ? null : Number(raw);
  if (cost != null && (!Number.isFinite(cost) || cost < 0)) return { error: "ค่าใช้จ่ายไม่ถูกต้อง" };

  try {
    await changeStatus({ requestId, to: "DONE", userId, actorRole, comment: str(f, "comment"), cost, chargeTenant: false });
  } catch (e) {
    if (e instanceof MaintenanceError) return { error: e.message };
    throw e;
  }
  revalidatePath("/tech");
  revalidatePath("/maintenance");
  redirect(withFlash("/tech", "ok", "ปิดงานแล้ว ขอบคุณครับ"));
}

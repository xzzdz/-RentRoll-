"use server";

import type { MaintenanceStatus, Priority } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { withFlash } from "@/lib/flash";
import { assignJob, changeStatus, createRequest, MaintenanceError, updateCharge } from "@/lib/maintenance";

const PRIORITIES: Priority[] = ["LOW", "NORMAL", "URGENT"];

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** ช่อง "ค่าใช้จ่าย" ว่างได้ = ยังไม่ระบุ */
function costOf(f: FormData, key = "cost") {
  const raw = str(f, key);
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) throw new MaintenanceError("ค่าใช้จ่ายไม่ถูกต้อง");
  return n;
}

export type FormState = { error?: string } | undefined;

export async function createAction(_prev: FormState, f: FormData): Promise<FormState> {
  const session = await requireRole("OWNER");
  const priority = str(f, "priority") as Priority;
  if (!PRIORITIES.includes(priority)) return { error: "เลือกความเร่งด่วน" };

  let id: string;
  try {
    const req = await createRequest(
      {
        roomId: str(f, "roomId"),
        category: str(f, "category") || "อื่น ๆ",
        title: str(f, "title"),
        description: str(f, "description"),
        priority,
        preferredTime: str(f, "preferredTime"),
        assignedToId: str(f, "assignedToId") || null,
        scheduledAt: str(f, "scheduledAt") || null,
      },
      session.userId,
    );
    id = req.id;
  } catch (e) {
    if (e instanceof MaintenanceError) return { error: e.message };
    throw e;
  }
  revalidatePath("/maintenance");
  redirect(withFlash(`/maintenance/${id}`, "ok", "เปิดงานแจ้งซ่อมแล้ว"));
}

export async function assignAction(_prev: FormState, f: FormData): Promise<FormState> {
  const session = await requireRole("OWNER");
  const requestId = str(f, "requestId");
  let name: string;
  try {
    const tech = await assignJob(
      { requestId, technicianId: str(f, "technicianId"), scheduledAt: str(f, "scheduledAt") || null, comment: str(f, "comment") },
      session.userId,
    );
    name = tech.name;
  } catch (e) {
    if (e instanceof MaintenanceError) return { error: e.message };
    throw e;
  }
  revalidatePath("/maintenance");
  redirect(withFlash(`/maintenance/${requestId}`, "ok", `มอบหมายงานให้${name}แล้ว`));
}

/** ปุ่มเปลี่ยนสถานะแบบคลิกเดียว (เริ่มซ่อม / ดึงงานกลับ) */
export async function statusAction(f: FormData) {
  const session = await requireRole("OWNER");
  const requestId = str(f, "requestId");
  const to = str(f, "to") as MaintenanceStatus;
  try {
    await changeStatus({ requestId, to, userId: session.userId, actorRole: "OWNER", comment: str(f, "comment") || null });
  } catch (e) {
    if (e instanceof MaintenanceError) redirect(withFlash(`/maintenance/${requestId}`, "err", e.message));
    throw e;
  }
  revalidatePath("/maintenance");
  redirect(withFlash(`/maintenance/${requestId}`, "ok", to === "IN_PROGRESS" ? "เริ่มซ่อมแล้ว" : "อัปเดตสถานะแล้ว"));
}

export async function completeAction(_prev: FormState, f: FormData): Promise<FormState> {
  const session = await requireRole("OWNER");
  const requestId = str(f, "requestId");
  let charged = false;
  try {
    const r = await changeStatus({
      requestId,
      to: "DONE",
      userId: session.userId,
      actorRole: "OWNER",
      comment: str(f, "comment"),
      cost: costOf(f),
      chargeTenant: f.get("chargeTenant") === "on",
    });
    charged = r.chargeTenant;
  } catch (e) {
    if (e instanceof MaintenanceError) return { error: e.message };
    throw e;
  }
  revalidatePath("/maintenance");
  revalidatePath("/billing");
  redirect(withFlash(`/maintenance/${requestId}`, "ok", charged ? "ปิดงานแล้ว — ค่าซ่อมจะเข้าบิลรอบถัดไป" : "ปิดงานแล้ว"));
}

export async function cancelAction(_prev: FormState, f: FormData): Promise<FormState> {
  const session = await requireRole("OWNER");
  const requestId = str(f, "requestId");
  const comment = str(f, "comment");
  if (!comment) return { error: "ระบุเหตุผลที่ยกเลิก" };
  try {
    await changeStatus({ requestId, to: "CANCELLED", userId: session.userId, actorRole: "OWNER", comment });
  } catch (e) {
    if (e instanceof MaintenanceError) return { error: e.message };
    throw e;
  }
  revalidatePath("/maintenance");
  redirect(withFlash(`/maintenance/${requestId}`, "ok", "ยกเลิกงานแล้ว"));
}

export async function chargeAction(_prev: FormState, f: FormData): Promise<FormState> {
  const session = await requireRole("OWNER");
  const requestId = str(f, "requestId");
  try {
    await updateCharge({ requestId, cost: costOf(f), chargeTenant: f.get("chargeTenant") === "on", userId: session.userId });
  } catch (e) {
    if (e instanceof MaintenanceError) return { error: e.message };
    throw e;
  }
  revalidatePath("/maintenance");
  revalidatePath("/billing");
  redirect(withFlash(`/maintenance/${requestId}`, "ok", "บันทึกค่าใช้จ่ายแล้ว"));
}

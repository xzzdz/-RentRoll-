"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { currentTenant } from "@/lib/tenant-auth";
import { createRequest, MaintenanceError } from "@/lib/maintenance";
import { withFlash } from "@/lib/flash";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export type RepairState = { error?: string } | undefined;

/**
 * ผู้เช่าแจ้งซ่อมเอง — ห้องถูกกำหนดจากสัญญาของคนที่ล็อกอิน ไม่ได้รับมาจากฟอร์ม
 * ไม่งั้นแก้ค่าในฟอร์มแล้วแจ้งซ่อมให้ห้องคนอื่นได้
 */
export async function createRepair(_prev: RepairState, f: FormData): Promise<RepairState> {
  const s = await requireRole("TENANT");
  const t = await currentTenant();
  if (!t.isActive) return { error: "สัญญาของคุณสิ้นสุดแล้ว แจ้งซ่อมใหม่ไม่ได้ ติดต่อสำนักงานหอพัก" };

  const title = str(f, "title");
  if (!title) return { error: "ระบุเรื่องที่ต้องการแจ้งซ่อม" };

  try {
    await createRequest(
      {
        roomId: t.room.id,
        category: str(f, "category") || "อื่น ๆ",
        title,
        description: str(f, "description"),
        priority: f.get("urgent") === "on" ? "URGENT" : "NORMAL",
        preferredTime: str(f, "preferredTime"),
      },
      s.userId,
    );
  } catch (e) {
    if (e instanceof MaintenanceError) return { error: e.message };
    throw e;
  }

  revalidatePath("/t/repairs");
  revalidatePath("/t");
  revalidatePath("/maintenance");
  redirect(withFlash("/t/repairs", "ok", "แจ้งซ่อมเรียบร้อย ทางหอได้รับเรื่องแล้ว"));
}

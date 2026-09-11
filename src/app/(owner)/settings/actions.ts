"use server";

import type { LateFeeMode, RateMode, UtilityType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { periodOf } from "@/lib/period";
import { withFlash } from "@/lib/flash";

const numOrNull = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const day = (v: FormDataEntryValue | null, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 1 && n <= 28 ? n : fallback;
};
const text = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};

/**
 * บันทึกอัตราค่าน้ำ/ไฟ — ถ้าแก้ในเดือนเดียวกันจะอัปเดตแถวเดิม
 * ถ้าเป็นเดือนใหม่จะสร้างแถวใหม่ (effectiveFrom = รอบนี้) เพื่อเก็บประวัติอัตรา
 */
async function saveRate(propertyId: string, utility: UtilityType, f: FormData, prefix: string) {
  const period = periodOf();
  const mode = (String(f.get(`${prefix}_mode`)) as RateMode) || "PER_UNIT";
  const data = {
    mode: (["PER_UNIT", "FLAT"] as RateMode[]).includes(mode) ? mode : "PER_UNIT",
    unitPrice: numOrNull(f.get(`${prefix}_unitPrice`)),
    minimumUnits: numOrNull(f.get(`${prefix}_minimumUnits`)),
    minimumCharge: numOrNull(f.get(`${prefix}_minimumCharge`)),
    flatAmount: numOrNull(f.get(`${prefix}_flatAmount`)),
  } as const;

  const current = await db.utilityRate.findFirst({
    where: { propertyId, utility, buildingId: null, effectiveFrom: { lte: period } },
    orderBy: { effectiveFrom: "desc" },
  });

  const changed =
    !current ||
    current.mode !== data.mode ||
    Number(current.unitPrice ?? null) !== Number(data.unitPrice ?? null) ||
    Number(current.minimumUnits ?? null) !== Number(data.minimumUnits ?? null) ||
    Number(current.minimumCharge ?? null) !== Number(data.minimumCharge ?? null) ||
    Number(current.flatAmount ?? null) !== Number(data.flatAmount ?? null);
  if (!changed) return;

  if (current && current.effectiveFrom.getTime() === period.getTime()) {
    await db.utilityRate.update({ where: { id: current.id }, data });
  } else {
    await db.utilityRate.create({ data: { ...data, propertyId, utility, effectiveFrom: period } });
  }
}

export async function saveSettings(formData: FormData) {
  const session = await requireRole("OWNER");
  const property = await db.property.findFirstOrThrow({ include: { billingSetting: true, feeItems: true } });
  const prev = property.billingSetting;

  await saveRate(property.id, "WATER", formData, "water");
  await saveRate(property.id, "ELECTRIC", formData, "electric");

  const lateMode = String(formData.get("lateFeeMode")) as LateFeeMode;
  const billing = {
    billingDay: day(formData.get("billingDay"), prev?.billingDay ?? 25),
    issueDay: day(formData.get("issueDay"), prev?.issueDay ?? 1),
    dueDay: day(formData.get("dueDay"), prev?.dueDay ?? 5),
    autoIssue: formData.get("autoIssue") === "on",
    lateFeeMode: (["NONE", "FIXED", "PER_DAY"] as LateFeeMode[]).includes(lateMode) ? lateMode : "NONE",
    lateFeeAmount: numOrNull(formData.get("lateFeeAmount")) ?? 0,
    lateFeeMax: numOrNull(formData.get("lateFeeMax")),
    graceDays: Math.round(numOrNull(formData.get("graceDays")) ?? 0),
    prorateFirstMonth: formData.get("prorateFirstMonth") === "on",
    promptPayId: text(formData.get("promptPayId")),
    bankName: text(formData.get("bankName")),
    bankAccountNo: text(formData.get("bankAccountNo")),
    bankAccountName: text(formData.get("bankAccountName")),
    receiptFooter: text(formData.get("receiptFooter")),
  };
  await db.billingSetting.upsert({ where: { propertyId: property.id }, create: { propertyId: property.id, ...billing }, update: billing });

  // ค่าบริการอื่น
  for (const fee of property.feeItems) {
    const amount = numOrNull(formData.get(`fee_${fee.id}_amount`));
    await db.feeItem.update({
      where: { id: fee.id },
      data: {
        name: text(formData.get(`fee_${fee.id}_name`)) ?? fee.name,
        amount: amount ?? fee.amount,
        isDefault: formData.get(`fee_${fee.id}_default`) === "on",
        isActive: formData.get(`fee_${fee.id}_active`) === "on",
      },
    });
  }
  const newName = text(formData.get("newFeeName"));
  const newAmount = numOrNull(formData.get("newFeeAmount"));
  if (newName && newAmount != null) {
    await db.feeItem.create({
      data: { propertyId: property.id, name: newName, amount: newAmount, isDefault: formData.get("newFeeDefault") === "on" },
    });
  }

  await db.auditLog.create({
    data: { userId: session.userId, entity: "BillingSetting", entityId: property.id, action: "UPDATE", after: billing },
  });

  revalidatePath("/", "layout");
  redirect(withFlash("/settings", "ok", "บันทึกการตั้งค่าแล้ว"));
}

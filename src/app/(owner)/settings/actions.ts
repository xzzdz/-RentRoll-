"use server";

import type { FeeCharge, LateFeeMode, RateMode, UtilityType } from "@prisma/client";
import bcrypt from "bcryptjs";
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
const on = (f: FormData, k: string) => f.get(k) === "on";

async function propertyId() {
  const p = await db.property.findFirstOrThrow({ select: { id: true } });
  return p.id;
}

async function audit(userId: string, entity: string, entityId: string, after: object) {
  await db.auditLog.create({ data: { userId, entity, entityId, action: "UPDATE", after } });
}

// ---------------------------------------------------------------
//  ข้อมูลหอพัก
// ---------------------------------------------------------------
export async function savePropertyInfo(f: FormData) {
  const session = await requireRole("OWNER");
  const id = await propertyId();
  const name = text(f.get("name"));
  if (!name) redirect(withFlash("/settings", "err", "ใส่ชื่อหอพัก"));

  await db.property.update({
    where: { id },
    data: { name, address: text(f.get("address")) ?? "", phone: text(f.get("phone")), taxId: text(f.get("taxId")) },
  });
  await db.billingSetting.upsert({
    where: { propertyId: id },
    create: { propertyId: id, receiptFooter: text(f.get("receiptFooter")) },
    update: { receiptFooter: text(f.get("receiptFooter")) },
  });
  await audit(session.userId, "Property", id, { name });
  revalidatePath("/", "layout");
  redirect(withFlash("/settings", "ok", "บันทึกข้อมูลหอพักแล้ว"));
}

// ---------------------------------------------------------------
//  อัตราค่าน้ำ / ค่าไฟ
// ---------------------------------------------------------------
/**
 * แก้ในเดือนเดียวกัน = อัปเดตแถวเดิม, เดือนใหม่ = สร้างแถวใหม่
 * เพื่อให้บิลย้อนหลังยังคิดด้วยอัตราที่ใช้ตอนนั้น
 */
async function saveRate(pid: string, utility: UtilityType, f: FormData, prefix: string) {
  const period = periodOf();
  const raw = String(f.get(`${prefix}_mode`)) as RateMode;
  const mode: RateMode = (["PER_UNIT", "FLAT"] as RateMode[]).includes(raw) ? raw : "PER_UNIT";
  const flat = mode === "FLAT";

  // เก็บเฉพาะช่องที่โหมดนั้นใช้จริง ไม่งั้นค่าที่ซ่อนอยู่จะค้างในฐานข้อมูลและสับสนตอนสลับโหมด
  const data = {
    mode,
    unitPrice: flat ? null : numOrNull(f.get(`${prefix}_unitPrice`)),
    minimumUnits: flat ? null : numOrNull(f.get(`${prefix}_minimumUnits`)),
    minimumCharge: flat ? null : numOrNull(f.get(`${prefix}_minimumCharge`)),
    flatAmount: flat ? numOrNull(f.get(`${prefix}_flatAmount`)) : null,
  } as const;

  const current = await db.utilityRate.findFirst({
    where: { propertyId: pid, utility, buildingId: null, effectiveFrom: { lte: period } },
    orderBy: { effectiveFrom: "desc" },
  });

  const same =
    current &&
    current.mode === data.mode &&
    Number(current.unitPrice ?? null) === Number(data.unitPrice ?? null) &&
    Number(current.minimumUnits ?? null) === Number(data.minimumUnits ?? null) &&
    Number(current.minimumCharge ?? null) === Number(data.minimumCharge ?? null) &&
    Number(current.flatAmount ?? null) === Number(data.flatAmount ?? null);
  if (same) return;

  if (current && current.effectiveFrom.getTime() === period.getTime()) {
    await db.utilityRate.update({ where: { id: current.id }, data });
  } else {
    await db.utilityRate.create({ data: { ...data, propertyId: pid, utility, effectiveFrom: period } });
  }
}

export async function saveRates(f: FormData) {
  const session = await requireRole("OWNER");
  const id = await propertyId();
  await saveRate(id, "WATER", f, "water");
  await saveRate(id, "ELECTRIC", f, "electric");
  await audit(session.userId, "UtilityRate", id, { at: new Date().toISOString() });
  revalidatePath("/meters");
  revalidatePath("/billing");
  redirect(withFlash("/settings/rates", "ok", "บันทึกอัตราค่าน้ำ-ค่าไฟแล้ว"));
}

// ---------------------------------------------------------------
//  รอบบิล & ค่าปรับ
// ---------------------------------------------------------------
export async function saveBillingCycle(f: FormData) {
  const session = await requireRole("OWNER");
  const id = await propertyId();
  const prev = await db.billingSetting.findUnique({ where: { propertyId: id } });
  const raw = String(f.get("lateFeeMode")) as LateFeeMode;
  const lateFeeMode: LateFeeMode = (["NONE", "FIXED", "PER_DAY"] as LateFeeMode[]).includes(raw) ? raw : "NONE";
  const noFee = lateFeeMode === "NONE";

  const data = {
    billingDay: day(f.get("billingDay"), prev?.billingDay ?? 25),
    issueDay: day(f.get("issueDay"), prev?.issueDay ?? 1),
    dueDay: day(f.get("dueDay"), prev?.dueDay ?? 5),
    autoIssue: on(f, "autoIssue"),
    prorateFirstMonth: on(f, "prorateFirstMonth"),
    lateFeeMode,
    lateFeeAmount: noFee ? 0 : (numOrNull(f.get("lateFeeAmount")) ?? 0),
    // เพดานค่าปรับใช้กับแบบรายวันเท่านั้น
    lateFeeMax: lateFeeMode === "PER_DAY" ? numOrNull(f.get("lateFeeMax")) : null,
    graceDays: noFee ? 0 : Math.round(numOrNull(f.get("graceDays")) ?? 0),
    contractAlertDays: Math.min(180, Math.max(0, Math.round(numOrNull(f.get("contractAlertDays")) ?? 45))),
  };
  await db.billingSetting.upsert({ where: { propertyId: id }, create: { propertyId: id, ...data }, update: data });
  await audit(session.userId, "BillingSetting", id, data);
  revalidatePath("/billing");
  redirect(withFlash("/settings/billing", "ok", "บันทึกรอบบิลแล้ว"));
}

// ---------------------------------------------------------------
//  ช่องทางรับเงิน
// ---------------------------------------------------------------
export async function savePayment(f: FormData) {
  const session = await requireRole("OWNER");
  const id = await propertyId();
  const data = {
    promptPayId: text(f.get("promptPayId")),
    bankName: text(f.get("bankName")),
    bankAccountNo: text(f.get("bankAccountNo")),
    bankAccountName: text(f.get("bankAccountName")),
  };
  await db.billingSetting.upsert({ where: { propertyId: id }, create: { propertyId: id, ...data }, update: data });
  await audit(session.userId, "BillingSetting", id, data);
  redirect(withFlash("/settings/payment", "ok", "บันทึกช่องทางรับเงินแล้ว"));
}

// ---------------------------------------------------------------
//  ค่าบริการอื่น — เพิ่ม/แก้/ลบได้ทีละรายการ
// ---------------------------------------------------------------
const CHARGES: FeeCharge[] = ["MONTHLY", "ONE_TIME"];

export async function addFee(f: FormData) {
  await requireRole("OWNER");
  const id = await propertyId();
  const name = text(f.get("name"));
  const amount = numOrNull(f.get("amount"));
  if (!name || amount == null) redirect(withFlash("/settings/fees", "err", "ใส่ชื่อรายการและราคา"));

  const raw = String(f.get("charge")) as FeeCharge;
  await db.feeItem.create({
    data: {
      propertyId: id,
      name,
      amount,
      charge: CHARGES.includes(raw) ? raw : "MONTHLY",
      isDefault: on(f, "isDefault"),
    },
  });
  revalidatePath("/settings/fees");
  redirect(withFlash("/settings/fees", "ok", `เพิ่ม "${name}" แล้ว`));
}

export async function updateFee(f: FormData) {
  await requireRole("OWNER");
  const id = String(f.get("id"));
  const fee = await db.feeItem.findUnique({ where: { id } });
  if (!fee) redirect(withFlash("/settings/fees", "err", "ไม่พบรายการ"));

  const raw = String(f.get("charge")) as FeeCharge;
  await db.feeItem.update({
    where: { id },
    data: {
      name: text(f.get("name")) ?? fee.name,
      amount: numOrNull(f.get("amount")) ?? fee.amount,
      charge: CHARGES.includes(raw) ? raw : fee.charge,
      isDefault: on(f, "isDefault"),
      isActive: on(f, "isActive"),
    },
  });
  revalidatePath("/settings/fees");
  redirect(withFlash("/settings/fees", "ok", "บันทึกรายการแล้ว"));
}

/** ลบได้จริงเฉพาะรายการที่ไม่เคยถูกใช้ในสัญญา ไม่งั้นปิดใช้งานแทนเพื่อไม่ให้บิลเก่าพัง */
export async function deleteFee(f: FormData) {
  await requireRole("OWNER");
  const id = String(f.get("id"));
  const used = await db.contractFee.count({ where: { feeItemId: id } });
  if (used > 0) {
    await db.feeItem.update({ where: { id }, data: { isActive: false } });
    revalidatePath("/settings/fees");
    redirect(withFlash("/settings/fees", "ok", `มี ${used} สัญญาใช้รายการนี้อยู่ — ปิดใช้งานแทนการลบ (สัญญาเดิมไม่กระทบ)`));
  }
  await db.feeItem.delete({ where: { id } });
  revalidatePath("/settings/fees");
  redirect(withFlash("/settings/fees", "ok", "ลบรายการแล้ว"));
}

// ---------------------------------------------------------------
//  ผู้ใช้และช่าง
// ---------------------------------------------------------------
export type TeamState = { error?: string } | undefined;

export async function addTechnician(_prev: TeamState, f: FormData): Promise<TeamState> {
  await requireRole("OWNER");
  const name = text(f.get("name"));
  const phone = text(f.get("phone"));
  const password = String(f.get("password") ?? "");
  if (!name) return { error: "ใส่ชื่อช่าง" };
  if (!phone) return { error: "ใส่เบอร์โทร (ใช้เป็นชื่อผู้ใช้ตอนล็อกอิน)" };
  if (password.length < 8) return { error: "รหัสผ่านอย่างน้อย 8 ตัวอักษร" };
  if (await db.user.findUnique({ where: { phone } })) return { error: "เบอร์นี้มีบัญชีอยู่แล้ว" };

  await db.user.create({ data: { role: "TECHNICIAN", name, phone, passwordHash: await bcrypt.hash(password, 10) } });
  revalidatePath("/settings/team");
  redirect(withFlash("/settings/team", "ok", `เพิ่มช่าง ${name} แล้ว`));
}

export async function setUserActive(f: FormData) {
  const session = await requireRole("OWNER");
  const id = String(f.get("id"));
  const active = f.get("active") === "1";
  if (id === session.userId) redirect(withFlash("/settings/team", "err", "ปิดบัญชีตัวเองไม่ได้"));

  const open = active ? 0 : await db.maintenanceRequest.count({ where: { assignedToId: id, status: { in: ["ASSIGNED", "IN_PROGRESS"] } } });
  if (open > 0) redirect(withFlash("/settings/team", "err", `ช่างคนนี้มีงานค้างอยู่ ${open} งาน — มอบหมายต่อให้คนอื่นก่อน`));

  await db.user.update({ where: { id }, data: { isActive: active } });
  revalidatePath("/settings/team");
  redirect(withFlash("/settings/team", "ok", active ? "เปิดใช้งานบัญชีแล้ว" : "ปิดใช้งานบัญชีแล้ว"));
}

export type PasswordState = { error?: string } | undefined;

export async function resetPassword(_prev: PasswordState, f: FormData): Promise<PasswordState> {
  await requireRole("OWNER");
  const id = String(f.get("id"));
  const password = String(f.get("password") ?? "");
  if (password.length < 8) return { error: "รหัสผ่านอย่างน้อย 8 ตัวอักษร" };
  await db.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  redirect(withFlash("/settings/team", "ok", "ตั้งรหัสผ่านใหม่แล้ว"));
}

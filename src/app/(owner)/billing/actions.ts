"use server";

import type { PaymentMethod } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole, currentPropertyId } from "@/lib/auth";
import { withFlash } from "@/lib/flash";
import { BillingError, applyLateFee, generateDrafts, issueInvoices, recordPayment, voidInvoice, voidPayment } from "@/lib/invoice";
import { assertInvoiceInScope } from "@/lib/scope";

const periodParam = (f: FormData) => {
  const p = String(f.get("period") ?? "");
  if (!/^\d{4}-\d{2}$/.test(p)) throw new Error("period ไม่ถูกต้อง");
  return { key: p, date: new Date(`${p}-01T00:00:00Z`) };
};

export async function generateDraftsAction(f: FormData) {
  await requireRole("OWNER");
  const { key, date } = periodParam(f);
  const property = await db.property.findUniqueOrThrow({ where: { id: await currentPropertyId() } });
  const r = await generateDrafts(property.id, date);
  revalidatePath("/billing");
  const parts = [`สร้างใหม่ ${r.created}`, `อัปเดต ${r.updated}`];
  if (r.skipped) parts.push(`ส่งแล้ว ${r.skipped} (ไม่แก้)`);
  if (r.missing.length) parts.push(`รอข้อมูล ${r.missing.length} ห้อง`);
  redirect(withFlash(`/billing?p=${key}`, r.missing.length ? "err" : "ok", `บิลร่าง: ${parts.join(" · ")}`));
}

export async function issueAllAction(f: FormData) {
  await requireRole("OWNER");
  const { key, date } = periodParam(f);
  const property = await db.property.findUniqueOrThrow({ where: { id: await currentPropertyId() } });
  const n = await issueInvoices(property.id, { period: date });
  revalidatePath("/billing");
  redirect(withFlash(`/billing?p=${key}`, "ok", n ? `ส่งบิลแล้ว ${n} ใบ` : "ไม่มีบิลร่างให้ส่ง"));
}

export async function issueOneAction(f: FormData) {
  await requireRole("OWNER");
  const id = String(f.get("invoiceId"));
  await assertInvoiceInScope(id);
  const property = await db.property.findUniqueOrThrow({ where: { id: await currentPropertyId() } });
  await issueInvoices(property.id, { ids: [id] });
  revalidatePath("/billing");
  redirect(withFlash(`/billing/${id}`, "ok", "ส่งบิลแล้ว"));
}

export async function lateFeeAction(f: FormData) {
  await requireRole("OWNER");
  const id = String(f.get("invoiceId"));
  await assertInvoiceInScope(id);
  const fee = await applyLateFee(id);
  revalidatePath(`/billing/${id}`);
  redirect(withFlash(`/billing/${id}`, "ok", fee ? `คิดค่าปรับ ${fee.days} วัน = ${fee.amount.toLocaleString("th-TH")} บาท` : "บิลนี้ยังไม่เกินกำหนด"));
}

export async function voidAction(f: FormData) {
  const session = await requireRole("OWNER");
  const id = String(f.get("invoiceId"));
  await assertInvoiceInScope(id);
  const reason = String(f.get("reason") ?? "").trim();
  const inv = await db.invoice.findUnique({ where: { id }, include: { period: true } });
  const back = inv?.period ? `/billing?p=${inv.period.periodMonth.toISOString().slice(0, 7)}` : "/billing";
  try {
    const r = await voidInvoice(id, reason, session.userId);
    revalidatePath("/billing");
    redirect(withFlash(back, "ok", r === "deleted" ? "ลบบิลร่างแล้ว" : "ยกเลิกบิลแล้ว — สร้างบิลร่างใหม่ได้"));
  } catch (e) {
    if (e instanceof BillingError) redirect(withFlash(`/billing/${id}`, "err", e.message));
    throw e;
  }
}

export type PaymentState = { error?: string } | undefined;
const METHODS: PaymentMethod[] = ["CASH", "TRANSFER", "PROMPTPAY"];

export async function paymentAction(_prev: PaymentState, f: FormData): Promise<PaymentState> {
  const session = await requireRole("OWNER");
  const id = String(f.get("invoiceId"));
  await assertInvoiceInScope(id);
  const amount = Number(f.get("amount"));
  const method = String(f.get("method")) as PaymentMethod;
  const d = String(f.get("paidAt") ?? "");
  if (!METHODS.includes(method)) return { error: "เลือกช่องทางชำระ" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return { error: "เลือกวันที่รับเงิน" };

  let receiptNo: string;
  try {
    const r = await recordPayment({
      invoiceId: id,
      amount,
      method,
      paidAt: new Date(`${d}T00:00:00Z`),
      note: String(f.get("note") ?? "").trim() || null,
      userId: session.userId,
    });
    receiptNo = r.receiptNo;
  } catch (e) {
    if (e instanceof BillingError) return { error: e.message };
    throw e;
  }
  revalidatePath("/billing");
  redirect(withFlash(`/billing/${id}`, "ok", `รับชำระแล้ว · ออกใบเสร็จ ${receiptNo}`));
}

/** ยกเลิกการรับชำระที่คีย์ผิด — ปลดยอดออกจากบิลแล้วประทับใบเสร็จว่ายกเลิก */
export async function voidPaymentAction(f: FormData) {
  const session = await requireRole("OWNER");
  const invoiceId = String(f.get("invoiceId"));
  await assertInvoiceInScope(invoiceId);
  const paymentId = String(f.get("paymentId"));
  const back = `/billing/${invoiceId}`;

  // payment ต้องเป็นของบิลใบที่ตรวจ scope มาแล้ว ไม่งั้นยิง paymentId ของบิลอื่นมาได้
  const owned = await db.payment.findFirst({ where: { id: paymentId, invoiceId }, select: { id: true } });
  if (!owned) redirect(withFlash(back, "err", "ไม่พบรายการรับชำระในบิลใบนี้"));

  try {
    const r = await voidPayment(paymentId, String(f.get("reason") ?? "").trim(), session.userId);
    revalidatePath("/billing");
    revalidatePath(back);
    redirect(withFlash(back, "ok", r.receiptNo ? `ยกเลิกใบเสร็จ ${r.receiptNo} แล้ว` : "ยกเลิกรายการรับชำระแล้ว"));
  } catch (e) {
    if (e instanceof BillingError) redirect(withFlash(back, "err", e.message));
    throw e;
  }
}

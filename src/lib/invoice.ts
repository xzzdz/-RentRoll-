// การออกบิล / ส่งบิล / รับชำระ / ค่าปรับ — ใช้จาก server actions และ cron
import type { InvoiceItemType, InvoiceStatus, PaymentMethod, UtilityType } from "@prisma/client";
import { db } from "./db";
import { addMonths, bangkokToday } from "./period";
import { buildBill, lateFee, proratedRent, round2, type InvoiceLine, type LateFeeConfig } from "./billing";
import { getRates } from "./rates";
import { pickReadings, readingsInclude, type MeterCell } from "./meters";
import { nextDocNo } from "./docno";
import { bahtText } from "./format";

/** error ที่แสดงให้ผู้ใช้เห็นได้ */
export class BillingError extends Error {}

export const PAYABLE: InvoiceStatus[] = ["ISSUED", "PARTIAL", "OVERDUE"];

type Line = InvoiceLine & { meterReadingId?: string | null; maintenanceId?: string | null };

export type BillingRow = {
  contractId: string;
  contractNo: string;
  roomId: string;
  roomNumber: string;
  tenantName: string;
  movingOut: boolean;
  invoice: { id: string; invoiceNo: string; status: InvoiceStatus; total: number; paidAmount: number } | null;
  bill: { lines: Line[]; total: number } | null;
  missing: string | null; // เหตุผลที่ยังคำนวณบิลไม่ได้
};

function missingReason(label: string, c: MeterCell | null, hasRate: boolean): string | null {
  if (!hasRate || !c) return null;
  if (c.prev == null) return `ไม่มีเลขตั้งต้นมิเตอร์${label}`;
  if (c.curr == null) return `ยังไม่จดมิเตอร์${label}`;
  if (c.curr < c.prev && !c.maxReading) return `เลขมิเตอร์${label}น้อยกว่าครั้งก่อน`;
  return null;
}

/** คำนวณบิลของทุกสัญญาในรอบ period (สัญญาที่ใช้งาน + สัญญาที่ย้ายออกในเดือนนั้น) */
export async function loadBillingRows(propertyId: string, period: Date): Promise<BillingRow[]> {
  const next = addMonths(period, 1);
  const setting = await db.billingSetting.findUnique({ where: { propertyId } });

  const contracts = await db.contract.findMany({
    where: {
      room: { building: { propertyId } },
      startDate: { lt: next },
      OR: [{ status: "ACTIVE" }, { status: "ENDED", moveOutDate: { gte: period, lt: next } }],
    },
    orderBy: { room: { number: "asc" } },
    include: {
      room: { include: { roomType: true, meters: readingsInclude(period) } },
      tenants: { where: { isPrimary: true }, include: { tenant: true } },
      fees: { include: { feeItem: true } },
      invoices: {
        where: { period: { is: { periodMonth: period } } },
        select: { id: true, invoiceNo: true, status: true, total: true, paidAmount: true },
      },
    },
  });

  // ค่าซ่อมที่เรียกเก็บผู้เช่า และยังไม่อยู่ในบิลที่ส่งแล้ว
  const repairs = await db.maintenanceRequest.findMany({
    where: {
      roomId: { in: contracts.map((c) => c.roomId) },
      status: "DONE",
      chargeTenant: true,
      cost: { gt: 0 },
      invoiceItems: { none: { invoice: { status: { notIn: ["DRAFT", "VOID"] } } } },
    },
  });

  const ratesCache = new Map<string, ReturnType<typeof getRates>>();
  const ratesFor = (buildingId: string) => {
    if (!ratesCache.has(buildingId)) ratesCache.set(buildingId, getRates(propertyId, period, buildingId));
    return ratesCache.get(buildingId)!;
  };

  const rows: BillingRow[] = [];
  for (const c of contracts) {
    const rates = await ratesFor(c.room.buildingId);
    const cell = (u: UtilityType) => {
      const m = c.room.meters.find((x) => x.utility === u);
      return m ? pickReadings(m, period) : null;
    };
    const w = cell("WATER");
    const e = cell("ELECTRIC");
    const rent = proratedRent(
      c.monthlyRent.toNumber(),
      period,
      c.startDate,
      c.status === "ENDED" ? c.moveOutDate : null,
      setting?.prorateFirstMonth ?? true,
    );
    const reading = (x: MeterCell | null) =>
      x && x.prev != null && x.curr != null ? { prev: x.prev, curr: x.curr, maxReading: x.maxReading } : null;

    const base = buildBill({
      rent: rent.amount,
      rentNote: rent.note,
      roomTypeName: c.room.roomType.name,
      water: reading(w),
      electric: reading(e),
      rates: { water: rates.water, electric: rates.electric },
      fees: c.fees
        .filter((f) => f.feeItem.isActive && f.feeItem.charge === "MONTHLY")
        .map((f) => ({ name: f.feeItem.name, amount: (f.amount ?? f.feeItem.amount).toNumber() })),
    });

    let bill: BillingRow["bill"] = null;
    if (base) {
      const lines: Line[] = base.lines.map((l) => ({
        ...l,
        meterReadingId: l.type === "WATER" ? w?.currId : l.type === "ELECTRIC" ? e?.currId : null,
      }));
      // ผูกตามผู้เช่าด้วย ไม่ใช่แค่ห้อง — กันค่าซ่อมของผู้เช่าคนก่อนไปโผล่ในบิลของผู้เช่ารายใหม่
      const roomRepairs = repairs.filter((x) => x.roomId === c.roomId && c.tenants.some((t) => t.tenantId === x.tenantId));
      for (const r of roomRepairs) {
        const cost = r.cost!.toNumber();
        lines.push({ type: "REPAIR", description: `ค่าซ่อม: ${r.title} (${r.ticketNo})`, quantity: 1, unitPrice: cost, amount: cost, maintenanceId: r.id });
      }
      bill = { lines, total: round2(lines.reduce((s, l) => s + l.amount, 0)) };
    }

    const inv = c.invoices[0];
    rows.push({
      contractId: c.id,
      contractNo: c.contractNo,
      roomId: c.roomId,
      roomNumber: c.room.number,
      tenantName: c.tenants[0]?.tenant.fullName ?? "-",
      movingOut: c.status === "ENDED",
      invoice: inv ? { id: inv.id, invoiceNo: inv.invoiceNo, status: inv.status, total: inv.total.toNumber(), paidAmount: inv.paidAmount.toNumber() } : null,
      bill,
      missing: bill ? null : missingReason("น้ำ", w, !!rates.water && rates.water.mode !== "FLAT") ?? missingReason("ไฟ", e, !!rates.electric && rates.electric.mode !== "FLAT") ?? "ข้อมูลไม่ครบ",
    });
  }
  return rows;
}

/** สร้าง/อัปเดตบิลร่างของรอบ — บิลที่ส่งแล้วจะไม่ถูกแตะ */
export async function generateDrafts(propertyId: string, period: Date) {
  const rows = await loadBillingRows(propertyId, period);
  const bp = await db.billingPeriod.upsert({
    where: { propertyId_periodMonth: { propertyId, periodMonth: period } },
    create: { propertyId, periodMonth: period },
    update: {},
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const missing: string[] = [];

  for (const r of rows) {
    if (r.invoice && r.invoice.status !== "DRAFT") {
      skipped++;
      continue;
    }
    if (!r.bill) {
      missing.push(r.roomNumber);
      continue;
    }
    const items = r.bill.lines.map((l, i) => ({
      type: l.type as InvoiceItemType,
      description: l.description,
      prevReading: l.prevReading ?? null,
      currReading: l.currReading ?? null,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      amount: l.amount,
      meterReadingId: l.meterReadingId ?? null,
      maintenanceId: l.maintenanceId ?? null,
      sortOrder: i,
    }));
    const totals = { subtotal: r.bill.total, discount: 0, lateFee: 0, total: r.bill.total };
    const existing = r.invoice;

    await db.$transaction(async (tx) => {
      if (existing) {
        await tx.invoiceItem.deleteMany({ where: { invoiceId: existing.id } });
        await tx.invoice.update({ where: { id: existing.id }, data: { ...totals, items: { create: items } } });
      } else {
        const invoiceNo = await nextDocNo(tx, propertyId, "INVOICE", period);
        await tx.invoice.create({ data: { invoiceNo, periodId: bp.id, contractId: r.contractId, ...totals, items: { create: items } } });
      }
    });
    if (existing) updated++;
    else created++;
  }

  await db.billingPeriod.update({
    where: { id: bp.id },
    data: { status: bp.status === "OPEN" ? "DRAFTED" : bp.status, draftedAt: new Date() },
  });
  return { created, updated, skipped, missing };
}

/** วันครบกำหนด = วันที่ dueDay ที่ถัดจากวันออกบิล */
export function dueDateFrom(issue: Date, dueDay: number) {
  const d = new Date(Date.UTC(issue.getUTCFullYear(), issue.getUTCMonth(), dueDay));
  return d < issue ? new Date(Date.UTC(issue.getUTCFullYear(), issue.getUTCMonth() + 1, dueDay)) : d;
}

/** ส่งบิลร่าง (DRAFT → ISSUED) ตาม id หรือทั้งรอบ */
export async function issueInvoices(propertyId: string, opts: { ids?: string[]; period?: Date }) {
  const setting = await db.billingSetting.findUnique({ where: { propertyId } });
  const today = bangkokToday();
  const res = await db.invoice.updateMany({
    where: {
      status: "DRAFT",
      contract: { room: { building: { propertyId } } },
      ...(opts.ids ? { id: { in: opts.ids } } : {}),
      ...(opts.period ? { period: { is: { periodMonth: opts.period } } } : {}),
    },
    data: { status: "ISSUED", issueDate: today, dueDate: dueDateFrom(today, setting?.dueDay ?? 5) },
  });

  // ไม่มีบิลร่างเหลือในรอบ → รอบนี้ส่งครบ
  const periods = await db.billingPeriod.findMany({ where: { propertyId, status: { in: ["OPEN", "DRAFTED"] } } });
  for (const p of periods) {
    const left = await db.invoice.count({ where: { periodId: p.id, status: "DRAFT" } });
    const any = await db.invoice.count({ where: { periodId: p.id } });
    if (any > 0 && left === 0) await db.billingPeriod.update({ where: { id: p.id }, data: { status: "ISSUED", issuedAt: new Date() } });
  }
  // TODO เฟส LINE: สร้าง Notification ให้ผู้เช่าที่ผูก LINE แล้ว
  return res.count;
}

/** บันทึกรับเงิน + ออกใบเสร็จ (เลขรันต่อเนื่อง) */
export async function recordPayment(input: {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  paidAt: Date;
  note?: string | null;
  userId: string;
}) {
  return db.$transaction(async (tx) => {
    const inv = await tx.invoice.findUnique({
      where: { id: input.invoiceId },
      include: { contract: { include: { room: { include: { building: true } } } } },
    });
    if (!inv) throw new BillingError("ไม่พบบิล");
    if (!PAYABLE.includes(inv.status)) throw new BillingError("บิลนี้ยังไม่ได้ส่ง หรือชำระครบแล้ว");

    const total = inv.total.toNumber();
    const outstanding = round2(total - inv.paidAmount.toNumber());
    const amount = round2(input.amount);
    if (!(amount > 0) || amount > outstanding) throw new BillingError(`ยอดรับชำระต้องอยู่ระหว่าง 0.01 – ${outstanding.toLocaleString("th-TH")} บาท`);

    const payment = await tx.payment.create({
      data: {
        invoiceId: inv.id,
        amount,
        method: input.method,
        status: "CONFIRMED",
        paidAt: input.paidAt,
        note: input.note ?? null,
        recordedById: input.userId,
      },
    });

    const paid = round2(inv.paidAmount.toNumber() + amount);
    const status: InvoiceStatus =
      paid >= total ? "PAID" : inv.dueDate && inv.dueDate < bangkokToday() ? "OVERDUE" : "PARTIAL";
    await tx.invoice.update({ where: { id: inv.id }, data: { paidAmount: paid, status } });

    const receiptNo = await nextDocNo(tx, inv.contract.room.building.propertyId, "RECEIPT", input.paidAt);
    return tx.receipt.create({ data: { receiptNo, paymentId: payment.id, amount, amountText: bahtText(amount) } });
  });
}

/** คิดค่าปรับบิลที่เกินกำหนด ณ วันที่ today (เรียกซ้ำได้ — อัปเดตยอดให้เป็นปัจจุบัน) */
export async function applyLateFee(invoiceId: string, today = bangkokToday()) {
  const inv = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true, contract: { include: { room: { include: { building: { include: { property: { include: { billingSetting: true } } } } } } } } },
  });
  const st = inv?.contract.room.building.property.billingSetting;
  if (!inv || !st || !inv.dueDate || !PAYABLE.includes(inv.status)) return null;

  const cfg: LateFeeConfig = {
    mode: st.lateFeeMode,
    amount: st.lateFeeAmount.toNumber(),
    max: st.lateFeeMax ? st.lateFeeMax.toNumber() : null,
    graceDays: st.graceDays,
  };
  const fee = lateFee(cfg, inv.dueDate, today);
  const daysLate = Math.floor((today.getTime() - inv.dueDate.getTime()) / 86_400_000);
  if (daysLate <= 0) return null;

  const current = inv.lateFee.toNumber();
  const existing = inv.items.find((i) => i.type === "LATE_FEE");
  const description = `ค่าปรับชำระล่าช้า ${fee.days} วัน`;

  await db.$transaction(async (tx) => {
    if (fee.amount > 0 && fee.amount !== current) {
      if (existing) {
        await tx.invoiceItem.update({ where: { id: existing.id }, data: { description, unitPrice: fee.amount, amount: fee.amount } });
      } else {
        await tx.invoiceItem.create({
          data: { invoiceId: inv.id, type: "LATE_FEE", description, quantity: 1, unitPrice: fee.amount, amount: fee.amount, sortOrder: 99 },
        });
      }
    }
    const lateAmount = fee.amount > 0 ? fee.amount : current;
    await tx.invoice.update({
      where: { id: inv.id },
      data: {
        lateFee: lateAmount,
        total: round2(inv.subtotal.toNumber() - inv.discount.toNumber() + lateAmount),
        status: "OVERDUE",
      },
    });
  });
  return fee;
}

/** ปรับสถานะ + ค่าปรับของทุกบิลที่เกินกำหนด (cron รายวัน) */
export async function processOverdue(propertyId: string, today = bangkokToday()) {
  const list = await db.invoice.findMany({
    where: { status: { in: PAYABLE }, dueDate: { lt: today }, contract: { room: { building: { propertyId } } } },
    select: { id: true },
  });
  for (const i of list) await applyLateFee(i.id, today);
  return list.length;
}

/** ยกเลิกบิล — บิลร่างลบทิ้ง, บิลที่ส่งแล้วเก็บไว้เป็น VOID และปลดออกจากรอบเพื่อออกบิลใหม่ได้ */
export async function voidInvoice(invoiceId: string, reason: string, userId: string) {
  const inv = await db.invoice.findUnique({ where: { id: invoiceId }, include: { payments: { where: { status: "CONFIRMED" } } } });
  if (!inv) throw new BillingError("ไม่พบบิล");
  if (inv.payments.length) throw new BillingError("บิลนี้มีการรับชำระแล้ว ยกเลิกไม่ได้");
  await db.$transaction(async (tx) => {
    if (inv.status === "DRAFT") await tx.invoice.delete({ where: { id: inv.id } });
    else await tx.invoice.update({ where: { id: inv.id }, data: { status: "VOID", periodId: null, note: reason || inv.note } });
    await tx.auditLog.create({
      data: { userId, entity: "Invoice", entityId: inv.id, action: inv.status === "DRAFT" ? "DELETE" : "VOID", before: { invoiceNo: inv.invoiceNo, total: inv.total.toNumber() }, after: { reason } },
    });
  });
  return inv.status === "DRAFT" ? "deleted" : "voided";
}

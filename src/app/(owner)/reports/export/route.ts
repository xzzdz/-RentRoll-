import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession, currentPropertyId } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { EXPENSE_CATEGORY } from "@/lib/expense";
import { thDate } from "@/lib/format";

const STATUS_TH: Record<string, string> = {
  DRAFT: "บิลร่าง",
  ISSUED: "รอชำระ",
  PARTIAL: "ชำระบางส่วน",
  PAID: "ชำระแล้ว",
  OVERDUE: "เกินกำหนด",
  VOID: "ยกเลิก",
};
const METHOD_TH: Record<string, string> = { CASH: "เงินสด", TRANSFER: "โอนเงิน", PROMPTPAY: "พร้อมเพย์" };
const ITEM_TH: Record<string, string> = {
  RENT: "ค่าเช่า",
  WATER: "ค่าน้ำ",
  ELECTRIC: "ค่าไฟ",
  FEE: "ค่าบริการ",
  LATE_FEE: "ค่าปรับ",
  REPAIR: "ค่าซ่อม",
  DISCOUNT: "ส่วนลด",
  OTHER: "อื่น ๆ",
};

const day = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00Z`) : null);
const num = (d: { toNumber(): number } | null | undefined) => (d == null ? "" : d.toNumber());

/**
 * ส่งออกรายงานเป็น CSV — เปิดใน Excel ได้เลย
 * /reports/export?type=invoices&from=2026-09-01&to=2026-09-30
 */
export async function GET(req: NextRequest) {
  // route handler ไม่ผ่าน middleware ของหน้า จึงต้องตรวจสิทธิ์เองที่นี่
  const session = await getSession();
  if (session?.role !== "OWNER") return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams;
  const type = q.get("type") ?? "summary";
  const from = day(q.get("from"));
  const to = day(q.get("to"));
  if (!from || !to) return NextResponse.json({ error: "ต้องระบุช่วงวันที่" }, { status: 400 });
  // ให้ช่วงวันที่รวมวันสุดท้ายด้วย
  const until = new Date(to.getTime() + 86_400_000);

  const property = await db.property.findUniqueOrThrow({ where: { id: await currentPropertyId() }, select: { id: true, name: true } });
  const scope = { contract: { room: { building: { propertyId: property.id } } } };
  const range = `${q.get("from")}_ถึง_${q.get("to")}`;

  if (type === "invoices") {
    const rows = await db.invoice.findMany({
      where: { ...scope, OR: [{ issueDate: { gte: from, lt: until } }, { issueDate: null, createdAt: { gte: from, lt: until } }] },
      orderBy: [{ issueDate: "asc" }, { invoiceNo: "asc" }],
      include: {
        contract: { include: { room: { include: { building: true } }, tenants: { where: { isPrimary: true }, include: { tenant: true } } } },
        items: true,
      },
    });
    const sum = (i: (typeof rows)[number], t: string) => i.items.filter((x) => x.type === t).reduce((s, x) => s + x.amount.toNumber(), 0);
    return csvResponse(
      `บิล_${range}.csv`,
      toCsv(
        ["เลขที่บิล", "ตึก", "ห้อง", "ผู้เช่า", "วันออกบิล", "ครบกำหนด", "ค่าเช่า", "ค่าน้ำ", "ค่าไฟ", "ค่าบริการ", "ค่าซ่อม", "ค่าปรับ", "ยอดรวม", "ชำระแล้ว", "คงค้าง", "สถานะ"],
        rows.map((i) => [
          i.invoiceNo,
          i.contract.room.building.name,
          i.contract.room.number,
          i.contract.tenants[0]?.tenant.fullName ?? "",
          i.issueDate ? thDate(i.issueDate) : "",
          i.dueDate ? thDate(i.dueDate) : "",
          sum(i, "RENT"),
          sum(i, "WATER"),
          sum(i, "ELECTRIC"),
          sum(i, "FEE"),
          sum(i, "REPAIR"),
          sum(i, "LATE_FEE"),
          i.total.toNumber(),
          i.paidAmount.toNumber(),
          i.total.toNumber() - i.paidAmount.toNumber(),
          STATUS_TH[i.status] ?? i.status,
        ]),
      ),
    );
  }

  if (type === "payments") {
    const rows = await db.payment.findMany({
      where: { status: "CONFIRMED", paidAt: { gte: from, lt: until }, invoice: scope },
      orderBy: { paidAt: "asc" },
      include: {
        receipt: true,
        recordedBy: { select: { name: true } },
        invoice: { include: { contract: { include: { room: { include: { building: true } }, tenants: { where: { isPrimary: true }, include: { tenant: true } } } } } },
      },
    });
    return csvResponse(
      `การรับชำระ_${range}.csv`,
      toCsv(
        ["วันที่รับเงิน", "เลขที่ใบเสร็จ", "เลขที่บิล", "ตึก", "ห้อง", "ผู้เช่า", "จำนวนเงิน", "ช่องทาง", "ผู้บันทึก", "หมายเหตุ"],
        rows.map((p) => [
          thDate(p.paidAt),
          p.receipt?.receiptNo ?? "",
          p.invoice.invoiceNo,
          p.invoice.contract.room.building.name,
          p.invoice.contract.room.number,
          p.invoice.contract.tenants[0]?.tenant.fullName ?? "",
          p.amount.toNumber(),
          METHOD_TH[p.method] ?? p.method,
          p.recordedBy?.name ?? "",
          p.note ?? "",
        ]),
      ),
    );
  }

  if (type === "expenses") {
    const rows = await db.expense.findMany({
      where: { propertyId: property.id, spentAt: { gte: from, lt: until } },
      orderBy: { spentAt: "asc" },
      include: { building: { select: { name: true } }, createdBy: { select: { name: true } } },
    });
    return csvResponse(
      `รายจ่าย_${range}.csv`,
      toCsv(
        ["วันที่จ่าย", "หมวด", "รายการ", "ตึก", "จำนวนเงิน", "หมายเหตุ", "ผู้บันทึก"],
        rows.map((e) => [
          thDate(e.spentAt),
          EXPENSE_CATEGORY[e.category].label,
          e.description,
          e.building?.name ?? "ทั้งหอ",
          e.amount.toNumber(),
          e.note ?? "",
          e.createdBy?.name ?? "",
        ]),
      ),
    );
  }

  if (type === "meters") {
    const rows = await db.meterReading.findMany({
      where: { periodMonth: { gte: from, lt: until }, meter: { room: { building: { propertyId: property.id } } } },
      orderBy: [{ periodMonth: "asc" }, { meter: { room: { number: "asc" } } }],
      include: { meter: { include: { room: { include: { building: true } } } }, readBy: { select: { name: true } } },
    });
    return csvResponse(
      `เลขมิเตอร์_${range}.csv`,
      toCsv(
        ["รอบเดือน", "ตึก", "ห้อง", "ประเภท", "เลขที่จด", "เลขตั้งต้น", "วันที่จด", "ผู้จด", "หมายเหตุ"],
        rows.map((r) => [
          r.periodMonth.toISOString().slice(0, 7),
          r.meter.room.building.name,
          r.meter.room.number,
          r.meter.utility === "WATER" ? "น้ำ" : "ไฟ",
          r.value.toNumber(),
          r.isInitial ? "ใช่" : "",
          r.readAt ? thDate(r.readAt) : "",
          r.readBy?.name ?? "",
          r.note ?? "",
        ]),
      ),
    );
  }

  if (type === "invoice-items") {
    const rows = await db.invoiceItem.findMany({
      where: { invoice: { ...scope, status: { not: "VOID" }, issueDate: { gte: from, lt: until } } },
      orderBy: [{ invoice: { invoiceNo: "asc" } }, { sortOrder: "asc" }],
      include: { invoice: { include: { contract: { include: { room: true } } } } },
    });
    return csvResponse(
      `รายการในบิล_${range}.csv`,
      toCsv(
        ["เลขที่บิล", "ห้อง", "ประเภท", "รายละเอียด", "เลขครั้งก่อน", "เลขครั้งนี้", "จำนวน", "ราคาต่อหน่วย", "จำนวนเงิน"],
        rows.map((it) => [
          it.invoice.invoiceNo,
          it.invoice.contract.room.number,
          ITEM_TH[it.type] ?? it.type,
          it.description,
          num(it.prevReading),
          num(it.currReading),
          it.quantity.toNumber(),
          it.unitPrice.toNumber(),
          it.amount.toNumber(),
        ]),
      ),
    );
  }

  return NextResponse.json({ error: "ไม่รู้จักรายงานนี้" }, { status: 400 });
}

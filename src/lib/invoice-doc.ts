import { db } from "./db";

/**
 * ข้อมูลใบแจ้งหนี้/ใบเสร็จ สำหรับแสดงผลและพิมพ์
 * propertyId บังคับใส่เสมอ — บิลใบหนึ่งมีทั้งชื่อ เบอร์ และยอดเงินของผู้เช่า
 * ถ้าไม่ผูกกับหอของคนเปิด ใครรู้ id ก็เปิดดูบิลของหออื่นได้
 */
export async function getInvoiceDoc(id: string, propertyId: string) {
  const inv = await db.invoice.findFirst({
    where: { id, contract: { room: { building: { propertyId } } } },
    include: {
      period: true,
      items: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { paidAt: "asc" }, include: { receipt: true, recordedBy: { select: { name: true } } } },
      contract: {
        include: {
          room: { include: { roomType: true, building: { include: { property: { include: { billingSetting: true } } } } } },
          tenants: { where: { isPrimary: true }, include: { tenant: true } },
        },
      },
    },
  });
  if (!inv) return null;
  const property = inv.contract.room.building.property;
  const tenant = inv.contract.tenants[0]?.tenant;

  return {
    id: inv.id,
    invoiceNo: inv.invoiceNo,
    status: inv.status,
    periodMonth: inv.period?.periodMonth ?? null,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate,
    subtotal: inv.subtotal.toNumber(),
    discount: inv.discount.toNumber(),
    lateFee: inv.lateFee.toNumber(),
    total: inv.total.toNumber(),
    paidAmount: inv.paidAmount.toNumber(),
    note: inv.note,
    items: inv.items.map((i) => ({
      id: i.id,
      type: i.type,
      description: i.description,
      prevReading: i.prevReading?.toNumber() ?? null,
      currReading: i.currReading?.toNumber() ?? null,
      quantity: i.quantity.toNumber(),
      unitPrice: i.unitPrice.toNumber(),
      amount: i.amount.toNumber(),
    })),
    payments: inv.payments.map((p) => ({
      id: p.id,
      amount: p.amount.toNumber(),
      method: p.method,
      status: p.status,
      paidAt: p.paidAt,
      note: p.note,
      recordedBy: p.recordedBy?.name ?? null,
      receipt: p.receipt
        ? { id: p.receipt.id, receiptNo: p.receipt.receiptNo, amount: p.receipt.amount.toNumber(), amountText: p.receipt.amountText, issuedAt: p.receipt.issuedAt, voidedAt: p.receipt.voidedAt }
        : null,
    })),
    room: { id: inv.contract.roomId, number: inv.contract.room.number, typeName: inv.contract.room.roomType.name },
    contractNo: inv.contract.contractNo,
    tenant: { name: tenant?.fullName ?? "-", phone: tenant?.phone ?? "", address: tenant?.address ?? null },
    property: {
      name: property.name,
      address: property.address,
      phone: property.phone,
      taxId: property.taxId,
      promptPayId: property.billingSetting?.promptPayId ?? null,
      bank: property.billingSetting?.bankName
        ? `${property.billingSetting.bankName} ${property.billingSetting.bankAccountNo ?? ""} ${property.billingSetting.bankAccountName ?? ""}`.trim()
        : null,
      footer: property.billingSetting?.receiptFooter ?? null,
    },
  };
}

export type InvoiceDoc = NonNullable<Awaited<ReturnType<typeof getInvoiceDoc>>>;

import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ReceiptText } from "lucide-react";
import { db } from "@/lib/db";
import { currentTenant, TENANT_INVOICE } from "@/lib/tenant-auth";
import { getInvoiceDoc } from "@/lib/invoice-doc";
import { money, thDate, thPeriod } from "@/lib/format";
import { withFlash } from "@/lib/flash";
import { cn } from "@/lib/utils";
import { INVOICE_STATUS, StatusBadge } from "@/components/StatusBadge";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import { PromptPayQR } from "@/components/PromptPayQR";
import { Card, CardContent } from "@/components/ui/card";
import { PrintButton } from "./PrintButton";

export const metadata = { title: "รายละเอียดบิล" };

const METHOD_TH: Record<string, string> = { CASH: "เงินสด", TRANSFER: "โอนเงิน", PROMPTPAY: "พร้อมเพย์" };

export default async function TenantBillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await currentTenant();

  // ต้องเป็นบิลของสัญญาที่ผู้เช่าคนนี้อยู่ด้วย และต้องเป็นบิลที่ส่งแล้วเท่านั้น
  const owns = await db.invoice.findFirst({
    where: { id, status: { in: TENANT_INVOICE }, contract: { tenants: { some: { tenantId: t.tenantId } } } },
    select: { id: true },
  });
  // พาไปหน้ารายการพร้อมบอกเหตุผล ดีกว่าโยน 404 เปล่า ๆ ใส่หน้าผู้เช่า
  // (และหน้านี้อยู่ใต้ loading.tsx ทำให้ notFound() ส่งสถานะ 404 จริงไม่ได้อยู่แล้ว)
  if (!owns) redirect(withFlash("/t/bills", "err", "ไม่พบบิลใบนี้ในบัญชีของคุณ"));

  const doc = await getInvoiceDoc(id, t.propertyId);
  if (!doc) redirect(withFlash("/t/bills", "err", "ไม่พบบิลใบนี้"));

  const left = doc.total - doc.paidAmount;
  const receipts = doc.payments.filter((p) => p.receipt && !p.receipt.voidedAt);

  return (
    <div className="grid gap-4">
      <Link href="/t/bills" className="text-muted-foreground no-print inline-flex items-center gap-1 text-sm hover:underline">
        <ChevronLeft className="size-4" /> บิลทั้งหมด
      </Link>

      <div className="no-print grid gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-0.5">
            <h1 className="font-display text-xl font-semibold">{doc.periodMonth ? thPeriod(doc.periodMonth) : "บิล"}</h1>
            <span className="num text-subtle text-[12.5px]">{doc.invoiceNo}</span>
          </div>
          <StatusBadge map={INVOICE_STATUS[doc.status]} />
        </div>

        {/* รายการในบิล */}
        <Card>
          <CardContent className="grid gap-2">
            {doc.items.map((it) => (
              <div key={it.id} className="flex items-baseline justify-between gap-3 text-[13.5px]">
                <span className="min-w-0">
                  {it.description}
                  {it.prevReading != null && it.currReading != null && (
                    <span className="num text-subtle block text-[11.5px]">
                      {it.prevReading.toLocaleString("th-TH")} → {it.currReading.toLocaleString("th-TH")} = {it.quantity.toLocaleString("th-TH")} หน่วย ×{" "}
                      {money(it.unitPrice)}
                    </span>
                  )}
                </span>
                <b className="num shrink-0">{money(it.amount)}</b>
              </div>
            ))}

            <div className="grid gap-1 border-t pt-2 text-[13.5px]">
              {doc.discount > 0 && (
                <div className="text-ok flex justify-between">
                  <span>ส่วนลด</span>
                  <span className="num">-{money(doc.discount)}</span>
                </div>
              )}
              {doc.lateFee > 0 && (
                <div className="text-destructive flex justify-between">
                  <span>ค่าปรับชำระล่าช้า</span>
                  <span className="num">{money(doc.lateFee)}</span>
                </div>
              )}
              <div className="font-display flex items-baseline justify-between text-[16px] font-semibold">
                <span>รวมทั้งสิ้น</span>
                <span className="num">{money(doc.total)}</span>
              </div>
              {doc.paidAmount > 0 && (
                <div className="text-muted-foreground flex justify-between">
                  <span>ชำระแล้ว</span>
                  <span className="num">{money(doc.paidAmount)}</span>
                </div>
              )}
              {left > 0 && (
                <div className={cn("flex items-baseline justify-between font-semibold", doc.status === "OVERDUE" ? "text-destructive" : "")}>
                  <span>คงเหลือ{doc.dueDate ? ` · ครบกำหนด ${thDate(doc.dueDate)}` : ""}</span>
                  <span className="num">{money(left)}</span>
                </div>
              )}
            </div>

            {doc.note && <p className="text-subtle border-t pt-2 text-[12.5px]">{doc.note}</p>}
          </CardContent>
        </Card>

        {/* ช่องทางจ่าย */}
        {left > 0 && (
          <Card>
            <CardContent className="grid gap-3">
              <span className="eyebrow">ชำระเงิน</span>
              {doc.property.promptPayId ? (
                <PromptPayQR promptPayId={doc.property.promptPayId} amount={left} name={doc.property.name} />
              ) : (
                <p className="text-muted-foreground text-[13.5px]">ยังไม่ได้ตั้งค่าพร้อมเพย์ ติดต่อสำนักงานหอพักเพื่อสอบถามช่องทางชำระ</p>
              )}
              {doc.property.bank && (
                <p className="text-muted-foreground border-t pt-2 text-[13px]">
                  หรือโอนเข้าบัญชี <span className="num">{doc.property.bank}</span>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ใบเสร็จ */}
        {receipts.length > 0 && (
          <Card>
            <CardContent className="grid gap-2">
              <span className="eyebrow">ใบเสร็จรับเงิน</span>
              {receipts.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 text-[13.5px]">
                  <span className="flex items-center gap-2">
                    <ReceiptText className="text-ok size-4 shrink-0" aria-hidden />
                    <span>
                      <b className="num block">{p.receipt!.receiptNo}</b>
                      <span className="text-subtle text-[11.5px]">
                        {thDate(p.paidAt)} · {METHOD_TH[p.method] ?? p.method}
                      </span>
                    </span>
                  </span>
                  <b className="num">{money(p.receipt!.amount)}</b>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <PrintButton />
      </div>

      {/* เอกสารเต็มหน้า A4 — ซ่อนบนจอ โผล่ตอนสั่งพิมพ์เท่านั้น */}
      <div className="hidden print:block">
        <InvoiceDocument doc={doc} />
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Printer, Send, TimerReset } from "lucide-react";
import { getInvoiceDoc } from "@/lib/invoice-doc";
import { PAYABLE } from "@/lib/invoice";
import { bangkokToday } from "@/lib/period";
import { money, thDate, thPeriod } from "@/lib/format";
import { PageHead } from "@/components/PageHead";
import { SubmitButton } from "@/components/SubmitButton";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import { INVOICE_STATUS, StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { issueOneAction, lateFeeAction } from "../actions";
import { PaymentDialog } from "./PaymentDialog";
import { VoidDialog } from "./VoidDialog";

const METHOD_TH = { CASH: "เงินสด", TRANSFER: "โอนเงิน", PROMPTPAY: "PromptPay" } as const;

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await getInvoiceDoc(id);
  if (!doc) notFound();

  const today = bangkokToday();
  const outstanding = Math.round((doc.total - doc.paidAmount) * 100) / 100;
  const payable = PAYABLE.includes(doc.status);
  const late = payable && doc.dueDate && doc.dueDate < today;
  const back = doc.periodMonth ? `/billing?p=${doc.periodMonth.toISOString().slice(0, 7)}` : "/billing";

  return (
    <>
      <Link href={back} className="text-muted-foreground mb-2 inline-flex items-center gap-1 text-sm hover:underline">
        <ChevronLeft className="size-4" /> {doc.periodMonth ? `บิลรอบ ${thPeriod(doc.periodMonth)}` : "บิล"}
      </Link>
      <PageHead
        title={`${doc.invoiceNo} · ห้อง ${doc.room.number}`}
        sub={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge map={INVOICE_STATUS[doc.status]} /> {doc.tenant.name}
            {doc.dueDate && ` · ครบกำหนด ${thDate(doc.dueDate)}`}
          </span>
        }
      />

      <div className="grid items-start gap-4 xl:grid-cols-[1fr_300px]">
        <div className="bg-muted overflow-x-auto rounded-xl border p-4">
          <InvoiceDocument doc={doc} />
        </div>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>ยอด</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ยอดรวม</span>
                <span className="num">{money(doc.total)}</span>
              </div>
              {doc.lateFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">รวมค่าปรับ</span>
                  <span className="num">{money(doc.lateFee)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">ชำระแล้ว</span>
                <span className="num">{money(doc.paidAmount)}</span>
              </div>
              <div className="flex justify-between border-t pt-1.5 text-base font-semibold">
                <span>คงค้าง</span>
                <span className={`num ${outstanding > 0 ? "text-destructive" : "text-ok"}`}>{money(outstanding)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid gap-2">
              {doc.status === "DRAFT" && (
                <form action={issueOneAction}>
                  <input type="hidden" name="invoiceId" value={doc.id} />
                  <SubmitButton className="w-full">
                    <Send /> ส่งบิลนี้
                  </SubmitButton>
                </form>
              )}
              {payable && <PaymentDialog invoiceId={doc.id} outstanding={outstanding} today={today.toISOString().slice(0, 10)} />}
              {late && (
                <form action={lateFeeAction}>
                  <input type="hidden" name="invoiceId" value={doc.id} />
                  <SubmitButton variant="outline" className="w-full">
                    <TimerReset /> คิดค่าปรับถึงวันนี้
                  </SubmitButton>
                </form>
              )}
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/print/invoice/${doc.id}`} target="_blank">
                  <Printer /> พิมพ์ / บันทึก PDF
                </Link>
              </Button>
              {doc.payments.length === 0 && doc.status !== "VOID" && <VoidDialog invoiceId={doc.id} isDraft={doc.status === "DRAFT"} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>การชำระเงิน</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {doc.payments.length === 0 && <p className="text-muted-foreground">ยังไม่มีการชำระ</p>}
              {doc.payments.map((p) => (
                <div key={p.id} className="grid gap-0.5 border-t pt-2 first:border-0 first:pt-0">
                  <div className="flex justify-between">
                    <b className="num">{money(p.amount)}</b>
                    <span className="text-muted-foreground">{METHOD_TH[p.method]}</span>
                  </div>
                  <div className="text-subtle text-xs">
                    {thDate(p.paidAt)}
                    {p.recordedBy ? ` · บันทึกโดย ${p.recordedBy}` : ""}
                    {p.note ? ` · ${p.note}` : ""}
                  </div>
                  {p.receipt && (
                    <Link href={`/print/receipt/${p.receipt.id}`} target="_blank" className="text-primary num text-xs hover:underline">
                      ใบเสร็จ {p.receipt.receiptNo}
                    </Link>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

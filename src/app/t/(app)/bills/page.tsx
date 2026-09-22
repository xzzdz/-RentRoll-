import Link from "next/link";
import { ChevronRight, ReceiptText } from "lucide-react";
import { db } from "@/lib/db";
import { currentTenant, TENANT_INVOICE } from "@/lib/tenant-auth";
import { money, thDate, thPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";
import { INVOICE_STATUS, StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "บิลของฉัน" };

export default async function TenantBillsPage() {
  const t = await currentTenant();

  const invoices = await db.invoice.findMany({
    where: { contract: { tenants: { some: { tenantId: t.tenantId } } }, status: { in: TENANT_INVOICE } },
    orderBy: [{ createdAt: "desc" }],
    take: 48,
    select: {
      id: true,
      invoiceNo: true,
      status: true,
      total: true,
      paidAmount: true,
      dueDate: true,
      period: { select: { periodMonth: true } },
      payments: { where: { status: "CONFIRMED" }, select: { receipt: { select: { id: true, receiptNo: true } } } },
    },
  });

  const owed = invoices.reduce((s, i) => s + Math.max(0, i.total.toNumber() - i.paidAmount.toNumber()), 0);

  return (
    <div className="grid gap-4">
      <div className="grid gap-0.5">
        <h1 className="font-display text-xl font-semibold">บิลของฉัน</h1>
        <p className="text-muted-foreground text-[13px]">
          ห้อง <span className="num">{t.room.number}</span> · {owed > 0 ? `ค้างอยู่ ${money(owed, 0)} บาท` : "ไม่มียอดค้าง"}
        </p>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-card grid justify-items-center gap-2 rounded-xl border border-dashed p-10 text-center">
          <ReceiptText className="text-subtle size-7" aria-hidden />
          <p className="text-muted-foreground text-[13.5px]">ยังไม่มีบิลที่ส่งถึงคุณ</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {invoices.map((i) => {
            const left = i.total.toNumber() - i.paidAmount.toNumber();
            const receipts = i.payments.filter((p) => p.receipt).length;
            return (
              <Link key={i.id} href={`/t/bills/${i.id}`} className="rounded-xl">
                <Card className={cn(i.status === "OVERDUE" && "shadow-[inset_3px_0_0_var(--destructive)]")}>
                  <CardContent className="flex items-center gap-3">
                    <div className="min-w-0 flex-1 grid gap-0.5">
                      <b className="font-display text-[15px]">{i.period ? thPeriod(i.period.periodMonth) : i.invoiceNo}</b>
                      <span className="num text-subtle text-xs">{i.invoiceNo}</span>
                      <span className="text-muted-foreground text-[12.5px]">
                        {left > 0 ? (
                          <>
                            ค้าง <b className="num">{money(left, 0)}</b> บาท
                            {i.dueDate ? ` · ครบกำหนด ${thDate(i.dueDate)}` : ""}
                          </>
                        ) : (
                          <>
                            ชำระครบ <b className="num">{money(i.total.toNumber(), 0)}</b> บาท
                            {receipts > 0 ? ` · มีใบเสร็จ ${receipts} ใบ` : ""}
                          </>
                        )}
                      </span>
                    </div>
                    <StatusBadge map={INVOICE_STATUS[i.status]} />
                    <ChevronRight className="text-subtle size-4 shrink-0" aria-hidden />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

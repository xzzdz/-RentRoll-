import Link from "next/link";
import { ChevronLeft, ChevronRight, FilePlus2, Send } from "lucide-react";
import { db } from "@/lib/db";
import { currentPropertyId } from "@/lib/auth";
import { addMonths, periodOf } from "@/lib/period";
import { money, thDate, thPeriod } from "@/lib/format";
import { loadBillingRows } from "@/lib/invoice";
import { cn } from "@/lib/utils";
import { PageHead } from "@/components/PageHead";
import { SubmitButton } from "@/components/SubmitButton";
import { INVOICE_STATUS, StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { generateDraftsAction, issueAllAction } from "./actions";

const key = (d: Date) => d.toISOString().slice(0, 7);

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  const period = p && /^\d{4}-\d{2}$/.test(p) ? new Date(`${p}-01T00:00:00Z`) : periodOf();
  const property = await db.property.findUniqueOrThrow({ where: { id: await currentPropertyId() }, include: { billingSetting: true } });

  const [rows, bp, invoices] = await Promise.all([
    loadBillingRows(property.id, period),
    db.billingPeriod.findUnique({ where: { propertyId_periodMonth: { propertyId: property.id, periodMonth: period } } }),
    db.invoice.findMany({
      where: { period: { is: { propertyId: property.id, periodMonth: period } } },
      select: { id: true, dueDate: true },
    }),
  ]);
  const dueById = new Map(invoices.map((i) => [i.id, i.dueDate] as const));

  const withInv = rows.filter((r) => r.invoice);
  const drafts = withInv.filter((r) => r.invoice!.status === "DRAFT").length;
  const billed = withInv.filter((r) => r.invoice!.status !== "DRAFT").reduce((s, r) => s + r.invoice!.total, 0);
  const received = withInv.reduce((s, r) => s + r.invoice!.paidAmount, 0);
  const ready = rows.filter((r) => !r.invoice && r.bill).length;
  const waiting = rows.filter((r) => !r.invoice && !r.bill).length;

  const stats = [
    { label: "สัญญาในรอบนี้", value: String(rows.length), sub: `มีบิลแล้ว ${withInv.length}` },
    { label: "บิลร่าง", value: String(drafts), sub: `พร้อมสร้างเพิ่ม ${ready} · รอข้อมูล ${waiting}` },
    { label: "เรียกเก็บ (ส่งแล้ว)", value: money(billed, 0), sub: "บาท" },
    { label: "รับชำระแล้ว", value: money(received, 0), sub: billed ? `${Math.round((received / billed) * 100)}% ของยอดเรียกเก็บ` : "บาท" },
  ];

  return (
    <>
      <PageHead
        title={`บิล & ใบเสร็จ · ${thPeriod(period)}`}
        sub={
          bp
            ? `สถานะรอบ: ${{ OPEN: "เปิดรอบ", DRAFTED: "มีบิลร่าง", ISSUED: "ส่งบิลครบแล้ว", CLOSED: "ปิดรอบ" }[bp.status]}${bp.issuedAt ? ` · ส่งเมื่อ ${thDate(bp.issuedAt)}` : ""}`
            : "ยังไม่ได้สร้างบิลรอบนี้"
        }
      >
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/billing?p=${key(addMonths(period, -1))}`} aria-label="เดือนก่อน">
              <ChevronLeft />
            </Link>
          </Button>
          <Button variant="outline" size="icon" asChild>
            <Link href={`/billing?p=${key(addMonths(period, 1))}`} aria-label="เดือนถัดไป">
              <ChevronRight />
            </Link>
          </Button>
        </div>
        <form action={generateDraftsAction}>
          <input type="hidden" name="period" value={key(period)} />
          <SubmitButton variant="outline" pendingText="กำลังคำนวณ…">
            <FilePlus2 /> สร้าง/อัปเดตบิลร่าง
          </SubmitButton>
        </form>
        <form action={issueAllAction}>
          <input type="hidden" name="period" value={key(period)} />
          <SubmitButton disabled={drafts === 0} pendingText="กำลังส่ง…">
            <Send /> ส่งบิลร่างทั้งหมด ({drafts})
          </SubmitButton>
        </form>
      </PageHead>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card rounded-xl border px-4 py-3.5">
            <div className="eyebrow">{s.label}</div>
            <div className="font-display mt-1 text-[22px] leading-tight font-semibold tabular-nums lg:text-[24px]">{s.value}</div>
            <div className="text-muted-foreground text-[12px]">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* มือถือ: การ์ดต่อห้อง — ตาราง 7 คอลัมน์ใช้บนจอเล็กไม่ได้ */}
      <div className="grid gap-2 lg:hidden">
        {rows.map((r) => {
          const due = r.invoice ? dueById.get(r.invoice.id) : null;
          return (
            <div key={r.contractId} className="bg-card grid gap-1.5 rounded-xl border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/rooms/${r.roomId}`} className="font-display num text-lg font-bold hover:underline">
                  {r.roomNumber}
                </Link>
                {r.invoice ? (
                  <StatusBadge map={INVOICE_STATUS[r.invoice.status]} />
                ) : r.bill ? (
                  <Badge variant="outline">พร้อมสร้างบิล</Badge>
                ) : (
                  <Link href="/meters">
                    <Badge variant="warn">{r.missing}</Badge>
                  </Link>
                )}
                {r.movingOut && <Badge variant="warn">บิลย้ายออก</Badge>}
                <span className="num ml-auto text-[15px] font-semibold">
                  {r.invoice ? money(r.invoice.total) : r.bill ? money(r.bill.total) : "—"}
                </span>
              </div>
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-[13px]">
                <span>{r.tenantName}</span>
                {r.invoice && (
                  <Link href={`/billing/${r.invoice.id}`} className="text-primary num hover:underline">
                    {r.invoice.invoiceNo}
                  </Link>
                )}
              </div>
              <div className="text-subtle flex flex-wrap items-center gap-x-2 text-[11.5px]">
                {due && <span>ครบกำหนด {thDate(due)}</span>}
                {r.invoice && r.invoice.paidAmount > 0 && (
                  <span>
                    · ชำระแล้ว <span className="num">{money(r.invoice.paidAmount)}</span>
                  </span>
                )}
                {!r.invoice && r.bill && <span>ยอดประมาณการจากเลขมิเตอร์</span>}
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="bg-card text-muted-foreground rounded-xl border border-dashed p-8 text-center">ไม่มีสัญญาในรอบนี้</p>
        )}
      </div>

      <div className="bg-card hidden rounded-xl border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">ห้อง</TableHead>
              <TableHead>ผู้เช่า</TableHead>
              <TableHead>เลขที่</TableHead>
              <TableHead className="text-right">ยอดรวม (บาท)</TableHead>
              <TableHead className="text-right">ชำระแล้ว</TableHead>
              <TableHead>ครบกำหนด</TableHead>
              <TableHead>สถานะ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const due = r.invoice ? dueById.get(r.invoice.id) : null;
              return (
                <TableRow key={r.contractId}>
                  <TableCell className="pl-4">
                    <Link href={`/rooms/${r.roomId}`} className="font-display font-bold hover:underline">
                      {r.roomNumber}
                    </Link>
                    {r.movingOut && (
                      <Badge variant="warn" className="ml-2">
                        บิลย้ายออก
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{r.tenantName}</TableCell>
                  <TableCell>
                    {r.invoice ? (
                      <Link href={`/billing/${r.invoice.id}`} className="num text-primary hover:underline">
                        {r.invoice.invoiceNo}
                      </Link>
                    ) : (
                      <span className="text-subtle">—</span>
                    )}
                  </TableCell>
                  <TableCell className={cn("num text-right", !r.invoice && "text-muted-foreground")}>
                    {r.invoice ? money(r.invoice.total) : r.bill ? money(r.bill.total) : "—"}
                  </TableCell>
                  <TableCell className="num text-right">{r.invoice?.paidAmount ? money(r.invoice.paidAmount) : "—"}</TableCell>
                  <TableCell>{due ? thDate(due) : "—"}</TableCell>
                  <TableCell>
                    {r.invoice ? (
                      <StatusBadge map={INVOICE_STATUS[r.invoice.status]} />
                    ) : r.bill ? (
                      <Badge variant="outline">พร้อมสร้างบิล</Badge>
                    ) : (
                      <Link href="/meters" className="hover:underline">
                        <Badge variant="warn">{r.missing}</Badge>
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                  ไม่มีสัญญาในรอบนี้
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-subtle mt-3 text-xs">
        ยอดในแถวที่ยังไม่มีบิลเป็นยอดประมาณการจากเลขมิเตอร์และอัตราปัจจุบัน · กด &quot;สร้าง/อัปเดตบิลร่าง&quot; ซ้ำได้ บิลที่ส่งแล้วจะไม่ถูกแก้
      </p>
    </>
  );
}

import Link from "next/link";
import { Download } from "lucide-react";
import { db } from "@/lib/db";
import { currentPropertyId } from "@/lib/auth";
import { addMonths, bangkokToday, periodOf } from "@/lib/period";
import { money, thDate, thMonthShort } from "@/lib/format";
import { round2 } from "@/lib/billing";
import { cn } from "@/lib/utils";
import { PageHead } from "@/components/PageHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "รายงาน" };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const parseDay = (v: string | undefined, fallback: Date) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00Z`) : fallback);

const EXPORTS = [
  { type: "invoices", label: "บิลทั้งหมด", desc: "เลขที่บิล ห้อง ผู้เช่า ยอดแยกตามประเภท และสถานะ" },
  { type: "payments", label: "การรับชำระ", desc: "ทุกครั้งที่รับเงิน พร้อมเลขที่ใบเสร็จและช่องทาง" },
  { type: "expenses", label: "รายจ่าย", desc: "รายจ่ายทุกหมวดพร้อมหมายเหตุ" },
  { type: "invoice-items", label: "รายการในบิล", desc: "แยกทุกบรรทัด ค่าเช่า ค่าน้ำ ค่าไฟ ค่าปรับ (สำหรับทำบัญชี)" },
  { type: "meters", label: "เลขมิเตอร์", desc: "เลขที่จดทุกห้องทุกรอบ" },
];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const { from: fromQ, to: toQ } = await searchParams;
  const today = bangkokToday();
  const thisMonth = periodOf(today);

  const from = parseDay(fromQ, addMonths(thisMonth, -5));
  const to = parseDay(toQ, today);
  const until = new Date(to.getTime() + 86_400_000);
  const propertyId = await currentPropertyId();

  const [invoices, payments, expenses] = await Promise.all([
    db.invoice.findMany({
      where: { status: { not: "VOID" }, contract: { room: { building: { propertyId } } }, period: { is: { periodMonth: { gte: periodOf(from), lt: until } } } },
      select: { total: true, paidAmount: true, period: { select: { periodMonth: true } } },
    }),
    db.payment.aggregate({
      where: { status: "CONFIRMED", paidAt: { gte: from, lt: until }, invoice: { contract: { room: { building: { propertyId } } } } },
      _sum: { amount: true },
      _count: true,
    }),
    db.expense.findMany({ where: { propertyId, spentAt: { gte: from, lt: until } }, select: { amount: true, spentAt: true } }),
  ]);

  // สรุปรายเดือนของช่วงที่เลือก
  const months: Date[] = [];
  for (let m = periodOf(from); m <= periodOf(to); m = addMonths(m, 1)) months.push(m);

  const rows = months.map((m) => {
    const next = addMonths(m, 1);
    const inv = invoices.filter((i) => i.period && i.period.periodMonth.getTime() === m.getTime());
    const billed = round2(inv.reduce((s, i) => s + i.total.toNumber(), 0));
    const collected = round2(inv.reduce((s, i) => s + i.paidAmount.toNumber(), 0));
    const spent = round2(expenses.filter((e) => e.spentAt >= m && e.spentAt < next).reduce((s, e) => s + e.amount.toNumber(), 0));
    return { m, billed, collected, outstanding: round2(billed - collected), spent, profit: round2(collected - spent) };
  });

  const totals = rows.reduce(
    (a, r) => ({
      billed: round2(a.billed + r.billed),
      collected: round2(a.collected + r.collected),
      outstanding: round2(a.outstanding + r.outstanding),
      spent: round2(a.spent + r.spent),
      profit: round2(a.profit + r.profit),
    }),
    { billed: 0, collected: 0, outstanding: 0, spent: 0, profit: 0 },
  );

  const qs = `from=${iso(from)}&to=${iso(to)}`;
  const presets = [
    { label: "เดือนนี้", from: thisMonth, to: today },
    { label: "เดือนที่แล้ว", from: addMonths(thisMonth, -1), to: new Date(thisMonth.getTime() - 86_400_000) },
    { label: "6 เดือน", from: addMonths(thisMonth, -5), to: today },
    { label: "ปีนี้", from: new Date(Date.UTC(today.getUTCFullYear(), 0, 1)), to: today },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHead title="รายงาน" sub={`${thDate(from)} – ${thDate(to)} · ส่งออกเป็นไฟล์ CSV เปิดใน Excel ได้ทันที`} />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <nav className="bg-muted inline-flex flex-wrap gap-0.5 rounded-lg p-[3px]">
          {presets.map((p) => {
            const on = iso(p.from) === iso(from) && iso(p.to) === iso(to);
            return (
              <Link
                key={p.label}
                href={`/reports?from=${iso(p.from)}&to=${iso(p.to)}`}
                aria-current={on ? "page" : undefined}
                className={cn("rounded-md px-3 py-1.5 text-sm font-medium", on ? "bg-card shadow-xs" : "text-muted-foreground hover:text-foreground")}
              >
                {p.label}
              </Link>
            );
          })}
        </nav>

        <form className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-[12px]">
            <span className="text-muted-foreground">ตั้งแต่</span>
            <input type="date" name="from" defaultValue={iso(from)} className="border-input bg-card num h-9 rounded-md border px-2 text-[13px]" />
          </label>
          <label className="grid gap-1 text-[12px]">
            <span className="text-muted-foreground">ถึง</span>
            <input type="date" name="to" defaultValue={iso(to)} className="border-input bg-card num h-9 rounded-md border px-2 text-[13px]" />
          </label>
          <Button type="submit" variant="outline" size="sm">
            ดูช่วงนี้
          </Button>
        </form>
      </div>

      <Card className="mb-4">
        <CardHeader className="border-b">
          <CardTitle>สรุปรายเดือน</CardTitle>
          <CardDescription>&ldquo;เก็บได้&rdquo; นับจากยอดที่ชำระเข้าบิลของรอบนั้น · &ldquo;กำไร&rdquo; = เก็บได้ − รายจ่ายในเดือนเดียวกัน</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>รอบ</TableHead>
                  <TableHead className="text-right">ออกบิล</TableHead>
                  <TableHead className="text-right">เก็บได้</TableHead>
                  <TableHead className="text-right">ค้าง</TableHead>
                  <TableHead className="text-right">รายจ่าย</TableHead>
                  <TableHead className="text-right">กำไร</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.m.toISOString()}>
                    <TableCell className="font-medium">{thMonthShort(r.m)}</TableCell>
                    <TableCell className="num text-right">{money(r.billed, 0)}</TableCell>
                    <TableCell className="num text-right">{money(r.collected, 0)}</TableCell>
                    <TableCell className={cn("num text-right", r.outstanding > 0 && "text-destructive")}>{money(r.outstanding, 0)}</TableCell>
                    <TableCell className="num text-right">{money(r.spent, 0)}</TableCell>
                    <TableCell className={cn("num text-right font-semibold", r.profit < 0 && "text-destructive")}>{money(r.profit, 0)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell className="font-semibold">รวม</TableCell>
                  <TableCell className="num text-right font-semibold">{money(totals.billed, 0)}</TableCell>
                  <TableCell className="num text-right font-semibold">{money(totals.collected, 0)}</TableCell>
                  <TableCell className={cn("num text-right font-semibold", totals.outstanding > 0 && "text-destructive")}>
                    {money(totals.outstanding, 0)}
                  </TableCell>
                  <TableCell className="num text-right font-semibold">{money(totals.spent, 0)}</TableCell>
                  <TableCell className={cn("num text-right font-semibold", totals.profit < 0 && "text-destructive")}>{money(totals.profit, 0)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <p className="text-subtle px-4 pt-3 text-[12px]">
            รับเงินจริงในช่วงนี้ <b className="num text-foreground">{money(payments._sum.amount?.toNumber() ?? 0, 0)}</b> บาท จาก {payments._count} ครั้ง
            (นับตามวันที่รับเงิน จึงอาจต่างจาก &ldquo;เก็บได้&rdquo; ที่นับตามรอบบิล)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>ส่งออกข้อมูล</CardTitle>
          <CardDescription>ไฟล์ CSV ฝังรหัสภาษาไทยไว้แล้ว เปิดใน Excel ได้เลยไม่ต้องตั้งค่า</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {EXPORTS.map((e) => (
            <div key={e.type} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <b className="text-[13.5px]">{e.label}</b>
                <div className="text-subtle text-[12px]">{e.desc}</div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={`/reports/export?type=${e.type}&${qs}`} download>
                  <Download /> ดาวน์โหลด
                </a>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

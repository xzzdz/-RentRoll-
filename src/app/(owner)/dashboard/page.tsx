import Link from "next/link";
import { AlertTriangle, ChevronLeft, ChevronRight, Gauge, ReceiptText, Wrench } from "lucide-react";
import { db } from "@/lib/db";
import { addMonths, bangkokToday, periodOf } from "@/lib/period";
import { money, thDate, thMonthShort, thPeriod } from "@/lib/format";
import { PAYABLE } from "@/lib/invoice";
import { OPEN_STATUS } from "@/lib/maintenance";
import { monthlySeries, monthsBack, roomTotals } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { PageHead } from "@/components/PageHead";
import { BarMonths } from "@/components/charts/BarMonths";
import { Sparkline } from "@/components/charts/Sparkline";
import { INVOICE_STATUS, MAINTENANCE_STATUS, StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const parsePeriod = (p?: string) => (p && /^\d{4}-\d{2}$/.test(p) ? new Date(`${p}-01T00:00:00Z`) : periodOf());
const key = (d: Date) => d.toISOString().slice(0, 7);

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  const period = parsePeriod(p);
  const property = await db.property.findFirstOrThrow({ include: { billingSetting: true } });
  const today = bangkokToday();
  const thisMonth = periodOf(today);
  const in60 = new Date(today.getTime() + 60 * 86_400_000);
  const activeRoom = { room: { contracts: { some: { status: "ACTIVE" as const } } } };

  const [series, rooms, payable, meterCount, readCount, draftCount, overdue, openJobs, newJobs, endingSoon] = await Promise.all([
    monthlySeries(property.id, monthsBack(period, 6)),
    roomTotals(property.id),
    db.invoice.aggregate({ where: { status: { in: PAYABLE } }, _sum: { total: true, paidAmount: true }, _count: true }),
    db.meter.count({ where: { isActive: true, ...activeRoom } }),
    db.meterReading.count({ where: { periodMonth: period, isInitial: false, meter: { isActive: true, ...activeRoom } } }),
    db.invoice.count({ where: { status: "DRAFT", period: { is: { periodMonth: period } } } }),
    db.invoice.findMany({
      where: { status: { in: ["OVERDUE", "PARTIAL"] } },
      orderBy: { dueDate: "asc" },
      take: 5,
      include: { contract: { include: { room: { select: { id: true, number: true } } } } },
    }),
    db.maintenanceRequest.findMany({
      where: { status: { in: OPEN_STATUS } },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: 5,
      include: { room: { select: { number: true } }, assignedTo: { select: { name: true } } },
    }),
    db.maintenanceRequest.count({ where: { status: "NEW" } }),
    db.contract.count({ where: { status: "ACTIVE", endDate: { gte: today, lte: in60 } } }),
  ]);

  const current = series[series.length - 1];
  const outstandingAll = (payable._sum.total?.toNumber() ?? 0) - (payable._sum.paidAmount?.toNumber() ?? 0);
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  const labels = series.map((s) => thMonthShort(s.period));
  const isCurrent = period.getTime() === thisMonth.getTime();
  const st = property.billingSetting;

  const kpis = [
    { label: `เก็บได้ ${thMonthShort(period)}`, value: money(current?.collected ?? 0, 0), sub: `จากที่ออกบิล ${money(current?.billed ?? 0, 0)} บาท` },
    { label: "ค้างรับทั้งหมด", value: money(outstandingAll, 0), sub: `บาท · ${payable._count} บิล`, tone: outstandingAll > 0 ? "text-destructive" : "" },
    { label: "อัตราเข้าพัก", value: `${pct(rooms.occupied, rooms.total)}%`, sub: `${rooms.occupied} / ${rooms.total} ห้อง · ว่าง ${rooms.vacant}` },
    { label: "งานซ่อมค้าง", value: String(openJobs.length ? Math.max(openJobs.length, newJobs) : newJobs), sub: `รอมอบหมาย ${newJobs} งาน`, tone: newJobs > 0 ? "text-warn" : "" },
  ];

  // สิ่งที่ค้างอยู่จริง ๆ เท่านั้น ถ้าไม่มีอะไรต้องทำก็ไม่ต้องขึ้นการ์ดให้รก
  const todos = [
    meterCount > readCount && {
      icon: Gauge,
      text: `ยังไม่ได้จดมิเตอร์ ${meterCount - readCount} จาก ${meterCount} ตัว`,
      href: "/meters",
      cta: "ไปจด",
      tone: "warn" as const,
    },
    draftCount > 0 && { icon: ReceiptText, text: `มีบิลร่างรอตรวจและส่ง ${draftCount} ใบ`, href: `/billing?p=${key(period)}`, cta: "ดูบิล", tone: "warn" as const },
    newJobs > 0 && { icon: Wrench, text: `งานแจ้งซ่อมรอมอบหมาย ${newJobs} งาน`, href: "/maintenance", cta: "มอบหมาย", tone: "bad" as const },
    overdue.length > 0 && { icon: AlertTriangle, text: `มีบิลเกินกำหนด/ค้างชำระ ${payable._count} ใบ`, href: "/billing", cta: "ติดตาม", tone: "bad" as const },
    endingSoon > 0 && { icon: AlertTriangle, text: `สัญญาใกล้หมดอายุใน 60 วัน ${endingSoon} ฉบับ`, href: "/tenants", cta: "ดูสัญญา", tone: "warn" as const },
  ].filter(Boolean) as { icon: typeof Gauge; text: string; href: string; cta: string; tone: "warn" | "bad" }[];

  return (
    <>
      <PageHead title="ภาพรวม" sub={`วันนี้ ${thDate(today)}${st ? ` · ส่งบิลวันที่ ${st.issueDay} ครบกำหนดวันที่ ${st.dueDay}` : ""}`}>
        <div className="bg-card flex items-center gap-1 rounded-lg border p-1">
          <Button variant="ghost" size="sm" asChild aria-label="เดือนก่อนหน้า">
            <Link href={`/dashboard?p=${key(addMonths(period, -1))}`}>
              <ChevronLeft />
            </Link>
          </Button>
          <span className="font-display min-w-[124px] text-center text-[13.5px] font-semibold">{thPeriod(period)}</span>
          <Button variant="ghost" size="sm" asChild aria-label="เดือนถัดไป" disabled={isCurrent}>
            <Link href={`/dashboard?p=${key(addMonths(period, 1))}`} aria-disabled={isCurrent} className={cn(isCurrent && "pointer-events-none opacity-40")}>
              <ChevronRight />
            </Link>
          </Button>
        </div>
      </PageHead>

      <div className="stagger mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-card rounded-xl border px-4 py-3.5 shadow-[var(--shadow-soft)]">
            <div className="eyebrow">{k.label}</div>
            <div className={cn("font-display mt-1 text-[24px] leading-tight font-semibold tabular-nums lg:text-[26px]", k.tone)}>{k.value}</div>
            <div className="text-muted-foreground text-[12px]">{k.sub}</div>
          </div>
        ))}
      </div>

      {todos.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="border-b">
            <CardTitle>ต้องทำตอนนี้</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1.5">
            {todos.map((t) => (
              <div key={t.text} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border px-3 py-2">
                <t.icon className={cn("size-4 shrink-0", t.tone === "bad" ? "text-destructive" : "text-warn")} aria-hidden />
                <span className="min-w-0 flex-1 text-[13.5px]">{t.text}</span>
                <Button variant="outline" size="sm" asChild>
                  <Link href={t.href}>{t.cta}</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>รายรับ 6 เดือนล่าสุด</CardTitle>
            <CardAction>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/billing?p=${key(period)}`}>ไปหน้าบิล</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <BarMonths
              labelA="เก็บได้"
              labelB="ยังค้าง"
              points={series.map((s) => ({ label: thMonthShort(s.period), a: s.collected, b: s.outstanding, muted: s.period.getTime() === period.getTime() ? false : true }))}
            />
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardContent>
              <Sparkline
                title="ห้องที่มีผู้เช่า"
                points={series.map((s) => s.occupied)}
                labels={labels}
                unit={`/ ${rooms.total} ห้อง`}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Sparkline title="หน่วยน้ำรวม" points={series.map((s) => s.water)} labels={labels} unit="หน่วย" />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Sparkline title="หน่วยไฟรวม" points={series.map((s) => s.electric)} labels={labels} unit="หน่วย" />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>ค้างชำระ</CardTitle>
            </CardHeader>
            <CardContent>
              {overdue.length === 0 ? (
                <p className="text-muted-foreground">ไม่มีบิลค้างชำระ</p>
              ) : (
                <ul className="divide-y">
                  {overdue.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                      <StatusBadge map={INVOICE_STATUS[i.status]} />
                      <Link href={`/billing/${i.id}`} className="min-w-0 flex-1 hover:underline">
                        ห้อง <b>{i.contract.room.number}</b> · ค้าง{" "}
                        <span className="num">{money(i.total.toNumber() - i.paidAmount.toNumber())}</span> บาท
                      </Link>
                      {i.dueDate && <span className="text-subtle text-xs">ครบ {thDate(i.dueDate)}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>งานซ่อมค้างอยู่</CardTitle>
              <CardAction>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/maintenance">ดูทั้งหมด</Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              {openJobs.length === 0 ? (
                <p className="text-muted-foreground">ไม่มีงานซ่อมค้าง</p>
              ) : (
                <ul className="divide-y">
                  {openJobs.map((j) => (
                    <li key={j.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                      <StatusBadge map={MAINTENANCE_STATUS[j.status]} />
                      <Link href={`/maintenance/${j.id}`} className="min-w-0 flex-1 hover:underline">
                        ห้อง <b>{j.room.number}</b> · {j.title}
                      </Link>
                      <span className="text-subtle text-xs">{j.assignedTo?.name ?? "ยังไม่มอบหมาย"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

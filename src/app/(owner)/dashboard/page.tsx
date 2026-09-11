import Link from "next/link";
import { Gauge } from "lucide-react";
import { db } from "@/lib/db";
import { addMonths, bangkokToday, periodOf } from "@/lib/period";
import { money, thDate, thPeriod } from "@/lib/format";
import { PAYABLE } from "@/lib/invoice";
import { PageHead } from "@/components/PageHead";
import { StatusBadge, INVOICE_STATUS } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const property = await db.property.findFirstOrThrow({ include: { billingSetting: true } });
  const today = bangkokToday();
  const period = periodOf(today);
  const in60 = new Date(today.getTime() + 60 * 86_400_000);
  const activeRoom = { room: { contracts: { some: { status: "ACTIVE" as const } } } };

  const [totalRooms, occupied, activeContracts, meterCount, readCount, ending, buildings, payable, attention] = await Promise.all([
    db.room.count(),
    db.room.count({ where: { status: "OCCUPIED" } }),
    db.contract.count({ where: { status: "ACTIVE" } }),
    db.meter.count({ where: { isActive: true, ...activeRoom } }),
    db.meterReading.count({ where: { periodMonth: period, isInitial: false, meter: { isActive: true, ...activeRoom } } }),
    db.contract.count({ where: { status: "ACTIVE", endDate: { gte: today, lte: in60 } } }),
    db.building.findMany({
      orderBy: { sortOrder: "asc" },
      select: { name: true, _count: { select: { rooms: true } }, rooms: { where: { status: "OCCUPIED" }, select: { id: true } } },
    }),
    db.invoice.aggregate({ where: { status: { in: PAYABLE } }, _sum: { total: true, paidAmount: true }, _count: true }),
    db.invoice.findMany({
      where: { status: { in: ["OVERDUE", "PARTIAL"] } },
      orderBy: { dueDate: "asc" },
      take: 6,
      include: { contract: { include: { room: true } } },
    }),
  ]);

  const outstanding = (payable._sum.total?.toNumber() ?? 0) - (payable._sum.paidAmount?.toNumber() ?? 0);
  const st = property.billingSetting;
  const next = addMonths(period, 1);
  const nextMonth = thDate(next).split(" ")[1];
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

  const kpis = [
    { label: "อัตราเข้าพัก", value: `${pct(occupied, totalRooms)}%`, sub: `${occupied} / ${totalRooms} ห้อง` },
    { label: "สัญญาที่ใช้งาน", value: String(activeContracts), sub: `ใกล้หมดใน 60 วัน ${ending} สัญญา` },
    { label: "จดมิเตอร์รอบนี้", value: `${pct(readCount, meterCount)}%`, sub: `${readCount} / ${meterCount} มิเตอร์` },
    { label: "ยอดค้างรับ", value: money(outstanding, 0), sub: `บาท · ${payable._count} บิล`, tone: outstanding > 0 ? "text-destructive" : "" },
  ];

  return (
    <>
      <PageHead title="ภาพรวม" sub={`วันนี้ ${thDate(today)} · รอบบิล ${thPeriod(period)}`}>
        <Button asChild>
          <Link href="/meters">
            <Gauge /> ไปจดมิเตอร์
          </Link>
        </Button>
      </PageHead>

      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="bg-card rounded-xl border px-4 py-3.5">
            <div className="eyebrow">{k.label}</div>
            <div className={`mt-1 font-display text-[26px] leading-tight font-semibold tabular-nums ${k.tone ?? ""}`}>{k.value}</div>
            <div className="text-muted-foreground text-[12.5px]">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>รอบบิล {thPeriod(period)}</CardTitle>
            <CardAction>
              <Button variant="outline" size="sm" asChild>
                <Link href="/billing">ไปหน้าบิล</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-3 sm:grid-cols-4">
              {[
                ["จดมิเตอร์", `${readCount}/${meterCount} มิเตอร์`],
                ["ตรวจบิลร่าง", st ? `สร้างวันที่ ${st.billingDay}` : "-"],
                ["ส่งบิล", st ? `วันที่ ${st.issueDay} ${nextMonth}` : "-"],
                ["ครบกำหนดชำระ", st ? `วันที่ ${st.dueDay} ${nextMonth}` : "-"],
              ].map(([t, s], i) => (
                <li key={t} className="grid gap-1">
                  <span
                    className={`grid size-7 place-items-center rounded-full border-2 font-display text-[13px] font-bold ${
                      i === 0 ? "border-primary text-primary" : "border-border"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <b className="text-[13.5px]">{t}</b>
                  <small className="text-muted-foreground text-xs">{s}</small>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>ค้างชำระ</CardTitle>
          </CardHeader>
          <CardContent>
            {attention.length === 0 ? (
              <p className="text-muted-foreground">ไม่มีบิลค้างชำระ</p>
            ) : (
              <ul className="divide-y">
                {attention.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 py-2">
                    <StatusBadge map={INVOICE_STATUS[i.status]} />
                    <Link href={`/billing/${i.id}`} className="flex-1 hover:underline">
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

        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle>การเข้าพักรายตึก</CardTitle>
            <CardAction>
              <Button variant="outline" size="sm" asChild>
                <Link href="/rooms">ดูผังห้อง</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-3">
            {buildings.map((b) => (
              <div key={b.name} className="grid grid-cols-[70px_1fr_70px] items-center gap-2.5 text-[13px]">
                <b className="font-display">{b.name}</b>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <i className="bg-primary block h-full rounded-full" style={{ width: `${pct(b.rooms.length, b._count.rooms)}%` }} />
                </div>
                <span className="num text-muted-foreground text-right">
                  {b.rooms.length}/{b._count.rooms}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

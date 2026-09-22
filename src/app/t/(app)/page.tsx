import Link from "next/link";
import { ChevronRight, Droplets, FileSignature, Megaphone, Plus, Zap } from "lucide-react";
import { db } from "@/lib/db";
import { currentTenant, TENANT_INVOICE } from "@/lib/tenant-auth";
import { bangkokToday, periodOf } from "@/lib/period";
import { money, thDate, thPeriod } from "@/lib/format";
import { OPEN_STATUS } from "@/lib/maintenance";
import { cn } from "@/lib/utils";
import { INVOICE_STATUS, MAINTENANCE_STATUS, StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "หน้าแรก" };

export default async function TenantHomePage() {
  const t = await currentTenant();
  const today = bangkokToday();
  const period = periodOf(today);

  const [unpaid, latest, jobs, news, readings] = await Promise.all([
    db.invoice.findMany({
      where: { contract: { tenants: { some: { tenantId: t.tenantId } } }, status: { in: ["ISSUED", "PARTIAL", "OVERDUE"] } },
      orderBy: { dueDate: "asc" },
      select: { id: true, invoiceNo: true, total: true, paidAmount: true, dueDate: true, status: true },
    }),
    db.invoice.findFirst({
      where: { contract: { tenants: { some: { tenantId: t.tenantId } } }, status: { in: TENANT_INVOICE } },
      orderBy: { createdAt: "desc" },
      select: { id: true, invoiceNo: true, total: true, status: true, period: { select: { periodMonth: true } } },
    }),
    db.maintenanceRequest.findMany({
      where: { roomId: t.room.id, status: { in: OPEN_STATUS } },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, ticketNo: true, title: true, status: true },
    }),
    db.announcement.findMany({
      where: {
        propertyId: t.propertyId,
        publishedAt: { not: null, lte: new Date() },
        OR: [{ buildingId: null }, { buildingId: t.building.id }],
        AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gte: today } }] }],
      },
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      take: 2,
      select: { id: true, title: true, pinned: true, publishedAt: true },
    }),
    db.meterReading.findMany({
      where: { meter: { roomId: t.room.id, isActive: true }, periodMonth: { lte: period } },
      orderBy: [{ periodMonth: "desc" }, { isInitial: "asc" }],
      take: 6,
      select: { value: true, periodMonth: true, isInitial: true, meter: { select: { utility: true } } },
    }),
  ]);

  const owed = unpaid.reduce((s, i) => s + i.total.toNumber() - i.paidAmount.toNumber(), 0);
  const dueSoon = unpaid[0]?.dueDate ?? null;
  const overdue = unpaid.some((i) => i.status === "OVERDUE");

  // หน่วยที่ใช้รอบล่าสุด = เลขล่าสุด - เลขก่อนหน้าของมิเตอร์ตัวเดียวกัน
  const usage = (u: "WATER" | "ELECTRIC") => {
    const rows = readings.filter((r) => r.meter.utility === u);
    if (rows.length < 2) return null;
    return { units: rows[0].value.toNumber() - rows[1].value.toNumber(), period: rows[0].periodMonth };
  };
  const water = usage("WATER");
  const electric = usage("ELECTRIC");

  return (
    <div className="grid gap-4">
      {!t.isActive && (
        <p className="bg-muted text-muted-foreground rounded-xl border px-4 py-3 text-[13px]">
          สัญญาของคุณสิ้นสุดแล้ว — ยังเปิดดูบิลและใบเสร็จย้อนหลังได้ แต่แจ้งซ่อมใหม่ไม่ได้
        </p>
      )}

      {/* ยอดค้าง — สิ่งแรกที่ผู้เช่าเปิดมาดู */}
      <Card className={cn(owed > 0 && overdue && "shadow-[inset_3px_0_0_var(--destructive)]")}>
        <CardContent className="grid gap-3">
          {owed > 0 ? (
            <>
              <div className="grid gap-0.5">
                <span className="eyebrow">ยอดที่ต้องชำระ</span>
                <b className={cn("num font-display text-3xl leading-tight", overdue ? "text-destructive" : "")}>{money(owed, 0)}</b>
                <span className="text-muted-foreground text-[13px]">
                  บาท · {unpaid.length} บิล
                  {dueSoon ? ` · ครบกำหนด ${thDate(dueSoon)}` : ""}
                  {overdue ? " · เลยกำหนดแล้ว" : ""}
                </span>
              </div>
              <Button asChild className="h-11">
                <Link href={`/t/bills/${unpaid[0].id}`}>ดูบิลและสแกนจ่าย</Link>
              </Button>
            </>
          ) : (
            <div className="grid gap-0.5">
              <span className="eyebrow">ยอดที่ต้องชำระ</span>
              <b className="font-display text-ok text-xl leading-tight">ไม่มียอดค้าง</b>
              <span className="text-muted-foreground text-[13px]">
                {latest ? `บิลล่าสุด ${latest.invoiceNo} ชำระครบแล้ว` : "ยังไม่มีบิลในระบบ"}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* น้ำ-ไฟรอบล่าสุด */}
      {(water || electric) && (
        <Link href="/t/meters" className="rounded-xl">
          <Card>
            <CardContent className="grid gap-2">
              <div className="flex items-center justify-between">
                <span className="eyebrow">ใช้ไปรอบ{water ? thPeriod(water.period) : electric ? thPeriod(electric.period) : ""}</span>
                <ChevronRight className="text-subtle size-4" aria-hidden />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <span className="flex items-center gap-2">
                  <Droplets className="text-plan-water-fg size-4 shrink-0" aria-hidden />
                  <span>
                    <b className="num font-display text-lg">{water ? water.units.toLocaleString("th-TH") : "—"}</b>
                    <span className="text-subtle text-xs"> หน่วยน้ำ</span>
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <Zap className="text-warn size-4 shrink-0" aria-hidden />
                  <span>
                    <b className="num font-display text-lg">{electric ? electric.units.toLocaleString("th-TH") : "—"}</b>
                    <span className="text-subtle text-xs"> หน่วยไฟ</span>
                  </span>
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* งานซ่อม */}
      <section className="grid gap-2">
        <div className="flex items-center justify-between">
          <h2 className="eyebrow">งานซ่อมที่ยังไม่ปิด</h2>
          {t.isActive && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/t/repairs/new">
                <Plus /> แจ้งซ่อม
              </Link>
            </Button>
          )}
        </div>
        {jobs.length === 0 ? (
          <p className="text-muted-foreground bg-card rounded-xl border border-dashed px-4 py-3 text-[13px]">ไม่มีงานซ่อมค้างอยู่</p>
        ) : (
          <div className="grid gap-1.5">
            {jobs.map((j) => (
              <Link key={j.id} href="/t/repairs" className="bg-card flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5">
                <span className="min-w-0">
                  <b className="block truncate text-[14px]">{j.title}</b>
                  <span className="num text-subtle text-xs">{j.ticketNo}</span>
                </span>
                <StatusBadge map={MAINTENANCE_STATUS[j.status]} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ประกาศ */}
      {news.length > 0 && (
        <section className="grid gap-2">
          <h2 className="eyebrow">ประกาศจากหอ</h2>
          <div className="grid gap-1.5">
            {news.map((n) => (
              <Link key={n.id} href="/t/announcements" className="bg-card flex items-center gap-2 rounded-xl border px-3 py-2.5">
                <Megaphone className="text-subtle size-4 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[14px]">{n.title}</b>
                  {n.publishedAt && <span className="text-subtle text-xs">{thDate(n.publishedAt)}</span>}
                </span>
                <ChevronRight className="text-subtle size-4 shrink-0" aria-hidden />
              </Link>
            ))}
          </div>
        </section>
      )}

      {latest && (
        <Link href="/t/bills" className="text-muted-foreground bg-card flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-[13.5px]">
          <span>
            บิลล่าสุด <b className="num text-foreground">{latest.invoiceNo}</b>
            {latest.period && ` · ${thPeriod(latest.period.periodMonth)}`}
          </span>
          <StatusBadge map={INVOICE_STATUS[latest.status]} />
        </Link>
      )}

      <Link href="/t/contract" className="text-muted-foreground bg-card flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[13.5px]">
        <FileSignature className="text-subtle size-4 shrink-0" aria-hidden />
        <span className="flex-1">สัญญาเช่าของฉัน</span>
        <ChevronRight className="text-subtle size-4 shrink-0" aria-hidden />
      </Link>
    </div>
  );
}

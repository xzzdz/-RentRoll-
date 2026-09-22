import Link from "next/link";
import type { MaintenanceStatus, Prisma } from "@prisma/client";
import { Plus, Search } from "lucide-react";
import { db } from "@/lib/db";
import { currentPropertyId } from "@/lib/auth";
import { OPEN_STATUS, pendingCharges } from "@/lib/maintenance";
import { money, thDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHead } from "@/components/PageHead";
import { MAINTENANCE_STATUS, PRIORITY, StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const TABS: { key: string; label: string; status: MaintenanceStatus[] }[] = [
  { key: "open", label: "ค้างอยู่", status: OPEN_STATUS },
  { key: "done", label: "เสร็จแล้ว", status: ["DONE"] },
  { key: "cancelled", label: "ยกเลิก", status: ["CANCELLED"] },
];

export default async function MaintenancePage({ searchParams }: { searchParams: Promise<{ q?: string; tab?: string }> }) {
  const { q = "", tab = "open" } = await searchParams;
  const current = TABS.find((t) => t.key === tab) ?? TABS[0];
  const propertyId = await currentPropertyId();

  const search = q.trim();
  const where: Prisma.MaintenanceRequestWhereInput = {
    status: { in: current.status },
    ...(search
      ? {
          OR: [
            { ticketNo: { contains: search, mode: "insensitive" } },
            { title: { contains: search, mode: "insensitive" } },
            { category: { contains: search, mode: "insensitive" } },
            { room: { number: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [jobs, newCount, inProgress, urgent, charges] = await Promise.all([
    db.maintenanceRequest.findMany({
      where,
      orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
      take: 300,
      include: { room: { include: { building: true } }, assignedTo: { select: { name: true } } },
    }),
    db.maintenanceRequest.count({ where: { status: "NEW" } }),
    db.maintenanceRequest.count({ where: { status: "IN_PROGRESS" } }),
    db.maintenanceRequest.count({ where: { status: { in: OPEN_STATUS }, priority: "URGENT" } }),
    pendingCharges(propertyId),
  ]);

  const kpis = [
    { label: "แจ้งใหม่ รอมอบหมาย", value: String(newCount), sub: "งาน", tone: newCount > 0 ? "text-destructive" : "" },
    { label: "กำลังซ่อม", value: String(inProgress), sub: "งาน" },
    { label: "งานด่วนค้างอยู่", value: String(urgent), sub: "งาน", tone: urgent > 0 ? "text-warn" : "" },
    { label: "ค่าซ่อมรอเข้าบิล", value: money(charges.amount, 0), sub: `บาท · ${charges.count} งาน` },
  ];

  return (
    <>
      <PageHead title="แจ้งซ่อม" sub={`${jobs.length} งานในมุมมองนี้`}>
        <Button asChild>
          <Link href="/maintenance/new">
            <Plus /> เปิดงานแจ้งซ่อม
          </Link>
        </Button>
      </PageHead>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-card rounded-xl border px-4 py-3.5">
            <div className="eyebrow">{k.label}</div>
            <div className={`font-display mt-1 text-[22px] leading-tight font-semibold tabular-nums lg:text-[26px] ${k.tone ?? ""}`}>{k.value}</div>
            <div className="text-muted-foreground text-[12px]">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border lg:pb-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <nav className="bg-muted inline-flex gap-0.5 rounded-lg p-[3px]">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={`/maintenance?tab=${t.key}${search ? `&q=${encodeURIComponent(search)}` : ""}`}
                aria-current={t.key === current.key ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1 text-sm font-medium",
                  t.key === current.key ? "bg-card shadow-xs" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <form className="relative w-full max-w-xs">
            <input type="hidden" name="tab" value={current.key} />
            <Search className="text-subtle pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input name="q" defaultValue={search} placeholder="ค้นหาเลขที่ เรื่อง ห้อง หมวด" className="pl-8" aria-label="ค้นหา" />
          </form>
        </div>

        {/* มือถือ: การ์ดต่องาน */}
        <div className="grid gap-2 p-3 lg:hidden">
          {jobs.map((j) => (
            <Link key={j.id} href={`/maintenance/${j.id}`} className="grid gap-1.5 rounded-xl border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <b className="font-display num text-[15px]">{j.room.number}</b>
                <StatusBadge map={MAINTENANCE_STATUS[j.status]} />
                {j.priority === "URGENT" && <Badge variant="bad">{PRIORITY.URGENT[1]}</Badge>}
                {j.cost && <span className="num ml-auto text-[14px] font-semibold">{money(j.cost.toNumber(), 0)}</span>}
              </div>
              <span className="text-[13.5px]">{j.title}</span>
              <div className="text-subtle flex flex-wrap items-center gap-x-2 text-[11.5px]">
                <span>{j.category}</span>
                <span className="num">· {j.ticketNo}</span>
                <span>· {thDateTime(j.createdAt, false)}</span>
                <span className={cn(!j.assignedTo && "text-warn")}>· {j.assignedTo?.name ?? "ยังไม่มอบหมาย"}</span>
                {j.chargeTenant && <span>· เก็บผู้เช่า</span>}
              </div>
            </Link>
          ))}
          {jobs.length === 0 && <p className="text-muted-foreground py-8 text-center">ไม่พบงานแจ้งซ่อม</p>}
        </div>

        <Table className="hidden lg:table">
          <TableHeader>
            <TableRow>
              <TableHead>ห้อง</TableHead>
              <TableHead>เรื่อง</TableHead>
              <TableHead>หมวด</TableHead>
              <TableHead>ช่าง</TableHead>
              <TableHead>แจ้งเมื่อ</TableHead>
              <TableHead className="text-right">ค่าซ่อม</TableHead>
              <TableHead>สถานะ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((j) => (
              <TableRow key={j.id}>
                <TableCell>
                  <Link href={`/maintenance/${j.id}`} className="font-display font-bold hover:underline">
                    {j.room.number}
                  </Link>
                  <div className="text-subtle num text-xs">{j.ticketNo}</div>
                </TableCell>
                <TableCell>
                  <Link href={`/maintenance/${j.id}`} className="hover:underline">
                    {j.title}
                  </Link>
                  {j.priority === "URGENT" && (
                    <Badge variant="bad" className="ml-2">
                      {PRIORITY.URGENT[1]}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{j.category}</TableCell>
                <TableCell className={cn(!j.assignedTo && "text-subtle")}>{j.assignedTo?.name ?? "ยังไม่มอบหมาย"}</TableCell>
                <TableCell className="text-muted-foreground">{thDateTime(j.createdAt, false)}</TableCell>
                <TableCell className="num text-right">
                  {j.cost ? money(j.cost.toNumber()) : "—"}
                  {j.chargeTenant && <div className="text-subtle text-xs">เก็บผู้เช่า</div>}
                </TableCell>
                <TableCell>
                  <StatusBadge map={MAINTENANCE_STATUS[j.status]} />
                </TableCell>
              </TableRow>
            ))}
            {jobs.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                  ไม่พบงานแจ้งซ่อม
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

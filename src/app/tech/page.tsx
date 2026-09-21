import Link from "next/link";
import { ChevronRight, LogOut } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { thDate, thDateTime } from "@/lib/format";
import { logout } from "@/app/login/actions";
import { MAINTENANCE_STATUS, PRIORITY, StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// หน้าช่าง — มือถือเป็นหลัก: ดูงานที่ได้รับมอบหมาย เริ่มซ่อม และปิดงาน
export default async function TechPage() {
  const s = await requireRole("TECHNICIAN", "OWNER");
  const mine = s.role === "OWNER" ? {} : { assignedToId: s.userId };

  const [jobs, done] = await Promise.all([
    db.maintenanceRequest.findMany({
      where: { ...mine, status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      include: { room: { include: { building: true } } },
    }),
    db.maintenanceRequest.findMany({
      where: { ...mine, status: "DONE", completedAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
      orderBy: { completedAt: "desc" },
      take: 10,
      include: { room: true },
    }),
  ]);

  return (
    <main className="mx-auto grid max-w-md gap-3 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold">งานของ{s.name}</h1>
          <p className="text-muted-foreground text-[13px]">
            {jobs.length ? `ค้างอยู่ ${jobs.length} งาน` : "ไม่มีงานค้าง"}
            {s.role === "OWNER" && " · มุมมองเจ้าของ (เห็นทุกงาน)"}
          </p>
        </div>
        <form action={logout}>
          <Button variant="outline" size="sm" type="submit">
            <LogOut /> ออก
          </Button>
        </form>
      </div>

      {jobs.length === 0 && <p className="bg-card text-muted-foreground rounded-xl border p-4">ยังไม่มีงานที่ได้รับมอบหมาย</p>}

      {jobs.map((j) => (
        <Link key={j.id} href={`/tech/${j.id}`} className="rounded-xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none">
          <Card className={j.priority === "URGENT" ? "shadow-[inset_3px_0_0_var(--destructive)]" : ""}>
            <CardContent className="grid gap-1">
              <div className="flex items-center justify-between gap-2">
                <b className="font-display text-lg">
                  {j.room.number} <span className="text-muted-foreground text-xs font-normal">{j.room.building.name}</span>
                </b>
                <div className="flex items-center gap-1.5">
                  {j.priority === "URGENT" && <Badge variant="bad">{PRIORITY.URGENT[1]}</Badge>}
                  <StatusBadge map={MAINTENANCE_STATUS[j.status]} />
                </div>
              </div>
              <span className="flex items-center justify-between gap-2">
                {j.title}
                <ChevronRight className="text-subtle size-4 shrink-0" aria-hidden />
              </span>
              <span className="text-subtle text-xs">
                {j.category} · <span className="num">{j.ticketNo}</span> · แจ้ง {thDateTime(j.createdAt, false)}
                {j.scheduledAt ? ` · นัด ${thDate(j.scheduledAt)}` : ""}
                {j.preferredTime ? ` · ${j.preferredTime}` : ""}
              </span>
            </CardContent>
          </Card>
        </Link>
      ))}

      {done.length > 0 && (
        <section className="mt-2 grid gap-1.5">
          <h2 className="eyebrow">ปิดงานไปแล้วใน 7 วัน</h2>
          {done.map((j) => (
            <Link key={j.id} href={`/tech/${j.id}`} className="bg-card flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-[13px]">
              <span className="truncate">
                <b className="font-display">{j.room.number}</b> · {j.title}
              </span>
              <span className="text-subtle shrink-0 text-xs">{j.completedAt ? thDate(j.completedAt) : ""}</span>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}

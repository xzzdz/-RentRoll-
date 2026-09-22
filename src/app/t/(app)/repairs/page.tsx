import Link from "next/link";
import { Plus, Wrench } from "lucide-react";
import { db } from "@/lib/db";
import { currentTenant } from "@/lib/tenant-auth";
import { thDate, thDateTime } from "@/lib/format";
import { OPEN_STATUS } from "@/lib/maintenance";
import { cn } from "@/lib/utils";
import { MAINTENANCE_STATUS, PRIORITY, StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "งานซ่อมของฉัน" };

export default async function TenantRepairsPage() {
  const t = await currentTenant();

  const jobs = await db.maintenanceRequest.findMany({
    where: { roomId: t.room.id },
    orderBy: [{ createdAt: "desc" }],
    take: 40,
    select: {
      id: true,
      ticketNo: true,
      title: true,
      description: true,
      category: true,
      priority: true,
      status: true,
      createdAt: true,
      scheduledAt: true,
      completedAt: true,
      preferredTime: true,
      assignedTo: { select: { name: true } },
      logs: { orderBy: { createdAt: "desc" }, take: 1, select: { comment: true, createdAt: true } },
    },
  });

  const open = jobs.filter((j) => OPEN_STATUS.includes(j.status)).length;

  return (
    <div className="grid gap-4">
      <div className="flex items-end justify-between gap-3">
        <div className="grid gap-0.5">
          <h1 className="font-display text-xl font-semibold">งานซ่อมของฉัน</h1>
          <p className="text-muted-foreground text-[13px]">
            ห้อง <span className="num">{t.room.number}</span> · {open > 0 ? `กำลังดำเนินการ ${open} เรื่อง` : "ไม่มีเรื่องค้าง"}
          </p>
        </div>
        {t.isActive && (
          <Button asChild>
            <Link href="/t/repairs/new">
              <Plus /> แจ้งซ่อม
            </Link>
          </Button>
        )}
      </div>

      {jobs.length === 0 ? (
        <div className="bg-card grid justify-items-center gap-3 rounded-xl border border-dashed p-10 text-center">
          <Wrench className="text-subtle size-7" aria-hidden />
          <p className="text-muted-foreground text-[13.5px]">ยังไม่เคยแจ้งซ่อม</p>
          {t.isActive && (
            <Button asChild variant="outline">
              <Link href="/t/repairs/new">แจ้งซ่อมเรื่องแรก</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-2">
          {jobs.map((j) => (
            <Card key={j.id} className={cn(j.priority === "URGENT" && OPEN_STATUS.includes(j.status) && "shadow-[inset_3px_0_0_var(--destructive)]")}>
              <CardContent className="grid gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <b className="font-display text-[15px]">{j.title}</b>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {j.priority === "URGENT" && <Badge variant="bad">{PRIORITY.URGENT[1]}</Badge>}
                    <StatusBadge map={MAINTENANCE_STATUS[j.status]} />
                  </div>
                </div>

                {j.description && <p className="text-muted-foreground text-[13px] leading-snug">{j.description}</p>}

                <span className="text-subtle text-xs">
                  {j.category} · <span className="num">{j.ticketNo}</span> · แจ้ง {thDateTime(j.createdAt, false)}
                  {j.preferredTime ? ` · สะดวก${j.preferredTime}` : ""}
                </span>

                {/* ความคืบหน้าล่าสุด — ผู้เช่าอยากรู้แค่ว่าถึงไหนแล้ว ใครมา และเมื่อไหร่ */}
                <div className="text-muted-foreground border-t pt-1.5 text-[12.5px]">
                  {j.status === "DONE" ? (
                    <>ซ่อมเสร็จแล้ว{j.completedAt ? ` เมื่อ ${thDate(j.completedAt)}` : ""}</>
                  ) : j.status === "CANCELLED" ? (
                    <>เรื่องนี้ถูกยกเลิก — ติดต่อสำนักงานหากยังมีปัญหาอยู่</>
                  ) : j.assignedTo ? (
                    <>
                      ช่าง{j.assignedTo.name}รับเรื่องแล้ว
                      {j.scheduledAt ? ` · นัดเข้า ${thDate(j.scheduledAt)}` : ""}
                    </>
                  ) : (
                    <>ทางหอได้รับเรื่องแล้ว กำลังจัดช่างให้</>
                  )}
                  {j.logs[0]?.comment && <span className="text-subtle block">“{j.logs[0].comment}”</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

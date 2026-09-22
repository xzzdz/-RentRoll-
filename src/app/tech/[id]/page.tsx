import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, PlayCircle } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { money, thDate, thDateTime } from "@/lib/format";
import { MAINTENANCE_STATUS, PRIORITY, StatusBadge } from "@/components/StatusBadge";
import { SubmitButton } from "@/components/SubmitButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { startJobAction } from "../actions";
import { CompleteJobDialog } from "./CompleteJobDialog";

export default async function TechJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireRole("TECHNICIAN", "OWNER");
  const job = await db.maintenanceRequest.findUnique({
    where: { id },
    include: {
      room: { include: { building: true } },
      tenant: { select: { fullName: true, phone: true } },
      logs: { orderBy: { createdAt: "asc" }, include: { user: { select: { name: true } } } },
    },
  });
  if (!job) notFound();
  // ช่างเห็นเฉพาะงานของตัวเอง เจ้าของเปิดดูได้ทุกงานในหอของตัวเอง
  const inScope = s.role === "OWNER" ? job.room.building.propertyId === s.propertyId : job.assignedToId === s.userId;
  if (!inScope) notFound();

  return (
    <main className="mx-auto grid max-w-md gap-3 px-4 py-6">
      <Link href="/tech" className="text-muted-foreground inline-flex items-center gap-1 text-sm hover:underline">
        <ChevronLeft className="size-4" /> งานของฉัน
      </Link>

      <div className="grid gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge map={MAINTENANCE_STATUS[job.status]} />
          {job.priority !== "NORMAL" && <Badge variant={PRIORITY[job.priority][0]}>{PRIORITY[job.priority][1]}</Badge>}
          <span className="text-subtle num text-xs">{job.ticketNo}</span>
        </div>
        <h1 className="font-display text-xl font-semibold">
          ห้อง {job.room.number} <span className="text-muted-foreground text-sm font-normal">{job.room.building.name}</span>
        </h1>
        <p className="text-[15px]">{job.title}</p>
      </div>

      <Card>
        <CardContent className="grid gap-2 text-[13.5px]">
          {job.description && <p className="bg-muted rounded-lg px-3 py-2 whitespace-pre-line">{job.description}</p>}
          <div className="grid grid-cols-[92px_1fr] gap-x-2 gap-y-1.5">
            <span className="text-muted-foreground">หมวดงาน</span>
            <span>{job.category}</span>
            <span className="text-muted-foreground">ผู้เช่า</span>
            <span>
              {job.tenant?.fullName ?? "—"}
              {job.tenant?.phone && (
                <a href={`tel:${job.tenant.phone}`} className="text-primary num ml-2 hover:underline">
                  {job.tenant.phone}
                </a>
              )}
            </span>
            {job.preferredTime && (
              <>
                <span className="text-muted-foreground">เวลาสะดวก</span>
                <span>{job.preferredTime}</span>
              </>
            )}
            {job.scheduledAt && (
              <>
                <span className="text-muted-foreground">นัดเข้าซ่อม</span>
                <span>{thDate(job.scheduledAt)}</span>
              </>
            )}
            {job.cost && (
              <>
                <span className="text-muted-foreground">ค่าใช้จ่าย</span>
                <span className="num">{money(job.cost.toNumber())} บาท</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {job.status === "ASSIGNED" && (
        <form action={startJobAction}>
          <input type="hidden" name="requestId" value={job.id} />
          <SubmitButton className="w-full" size="lg">
            <PlayCircle /> เริ่มซ่อม
          </SubmitButton>
        </form>
      )}
      {job.status === "IN_PROGRESS" && <CompleteJobDialog requestId={job.id} />}

      <section className="mt-2 grid gap-2">
        <h2 className="eyebrow">ไทม์ไลน์</h2>
        {job.logs.map((l) => (
          <div key={l.id} className="bg-card grid gap-0.5 rounded-lg border px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge map={MAINTENANCE_STATUS[l.toStatus]} />
              <span className="text-subtle text-xs">
                {thDateTime(l.createdAt)} · {l.user.name}
              </span>
            </div>
            {l.comment && <p className="text-[13.5px]">{l.comment}</p>}
          </div>
        ))}
      </section>
    </main>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, PlayCircle } from "lucide-react";
import { db } from "@/lib/db";
import { currentPropertyId } from "@/lib/auth";
import { bangkokToday } from "@/lib/period";
import { money, thDate, thDateTime } from "@/lib/format";
import { PageHead } from "@/components/PageHead";
import { SubmitButton } from "@/components/SubmitButton";
import { MAINTENANCE_STATUS, PRIORITY, StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { statusAction } from "../actions";
import { AssignDialog } from "./AssignDialog";
import { CancelDialog } from "./CancelDialog";
import { ChargeDialog } from "./ChargeDialog";
import { CompleteDialog } from "./CompleteDialog";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 py-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

export default async function MaintenanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // งานซ่อมต้องอยู่ในหอของผู้ใช้ ไม่งั้นรู้ id ก็เปิดดูงาน ชื่อผู้เช่า และเบอร์โทรของหออื่นได้
  const propertyId = await currentPropertyId();
  const job = await db.maintenanceRequest.findFirst({
    where: { id, room: { building: { propertyId } } },
    include: {
      room: { include: { building: true } },
      tenant: true,
      assignedTo: { select: { id: true, name: true } },
      logs: { orderBy: { createdAt: "asc" }, include: { user: { select: { name: true, role: true } } } },
      invoiceItems: { include: { invoice: { select: { id: true, invoiceNo: true, status: true } } } },
    },
  });
  if (!job) notFound();

  const techs = await db.user.findMany({
    where: { role: "TECHNICIAN", isActive: true, propertyId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const open = job.status === "NEW" || job.status === "ASSIGNED" || job.status === "IN_PROGRESS";
  const billedItem = job.invoiceItems.find((i) => i.invoice.status !== "VOID");
  const editableCharge = job.status === "DONE" && !job.invoiceItems.some((i) => !["DRAFT", "VOID"].includes(i.invoice.status));
  const today = bangkokToday().toISOString().slice(0, 10);

  return (
    <>
      <Link href="/maintenance" className="text-muted-foreground mb-2 inline-flex items-center gap-1 text-sm hover:underline">
        <ChevronLeft className="size-4" /> แจ้งซ่อม
      </Link>
      <PageHead
        title={`${job.ticketNo} · ห้อง ${job.room.number}`}
        sub={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge map={MAINTENANCE_STATUS[job.status]} />
            {job.priority !== "NORMAL" && <Badge variant={PRIORITY[job.priority][0]}>{PRIORITY[job.priority][1]}</Badge>}
            {job.category} · {job.room.building.name}
          </span>
        }
      />

      <div className="grid items-start gap-4 xl:grid-cols-[1fr_300px]">
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{job.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {job.description && <p className="bg-muted mb-3 rounded-lg px-3 py-2 whitespace-pre-line">{job.description}</p>}
              <dl className="divide-y text-[13.5px]">
                <Row label="ห้อง">
                  <Link href={`/rooms/${job.roomId}`} className="font-display font-bold hover:underline">
                    {job.room.number}
                  </Link>
                </Row>
                <Row label="ผู้เช่า">{job.tenant?.fullName ?? <span className="text-subtle">ไม่ได้ผูกผู้เช่า</span>}</Row>
                {job.tenant?.phone && <Row label="เบอร์โทร">{<span className="num">{job.tenant.phone}</span>}</Row>}
                <Row label="ช่าง">{job.assignedTo?.name ?? <span className="text-subtle">ยังไม่มอบหมาย</span>}</Row>
                {job.preferredTime && <Row label="เวลาที่สะดวก">{job.preferredTime}</Row>}
                {job.scheduledAt && <Row label="นัดเข้าซ่อม">{thDate(job.scheduledAt)}</Row>}
                <Row label="เปิดงานเมื่อ">{thDateTime(job.createdAt)}</Row>
                {job.completedAt && <Row label="ปิดงานเมื่อ">{thDate(job.completedAt)}</Row>}
                <Row label="ค่าใช้จ่าย">
                  {job.cost ? <span className="num">{money(job.cost.toNumber())} บาท</span> : <span className="text-subtle">ไม่ระบุ</span>}
                </Row>
                <Row label="เรียกเก็บ">
                  {job.chargeTenant ? (
                    billedItem ? (
                      <Link href={`/billing/${billedItem.invoice.id}`} className="text-primary hover:underline">
                        อยู่ในบิล <span className="num">{billedItem.invoice.invoiceNo}</span>
                      </Link>
                    ) : (
                      <Badge variant="warn">รอเข้าบิลรอบถัดไป</Badge>
                    )
                  ) : (
                    <span className="text-subtle">หอรับผิดชอบ</span>
                  )}
                </Row>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ไทม์ไลน์</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="grid gap-3">
                {job.logs.map((l) => (
                  <li key={l.id} className="grid grid-cols-[auto_1fr] gap-3">
                    <span className="bg-border mt-1.5 grid w-px justify-self-center">
                      <i className="bg-primary -ml-[3px] size-[7px] rounded-full" aria-hidden />
                    </span>
                    <div className="grid gap-0.5 pb-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge map={MAINTENANCE_STATUS[l.toStatus]} />
                        <span className="text-subtle text-xs">
                          {thDateTime(l.createdAt)} · {l.user.name}
                        </span>
                      </div>
                      {l.comment && <p className="text-[13.5px]">{l.comment}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>จัดการงาน</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {open && (
              <AssignDialog
                requestId={job.id}
                techs={techs}
                currentTechId={job.assignedTo?.id ?? null}
                scheduledAt={job.scheduledAt ? job.scheduledAt.toISOString().slice(0, 10) : null}
                today={today}
              />
            )}
            {job.status === "ASSIGNED" && (
              <form action={statusAction}>
                <input type="hidden" name="requestId" value={job.id} />
                <input type="hidden" name="to" value="IN_PROGRESS" />
                <SubmitButton variant="outline" className="w-full">
                  <PlayCircle /> เริ่มซ่อม
                </SubmitButton>
              </form>
            )}
            {job.status === "IN_PROGRESS" && <CompleteDialog requestId={job.id} hasTenant={!!job.tenantId} />}
            {editableCharge && (
              <ChargeDialog
                requestId={job.id}
                cost={job.cost ? job.cost.toNumber() : null}
                chargeTenant={job.chargeTenant}
                hasTenant={!!job.tenantId}
              />
            )}
            {open && <CancelDialog requestId={job.id} />}
            {!open && !editableCharge && <p className="text-muted-foreground text-[13.5px]">งานนี้ปิดแล้ว</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

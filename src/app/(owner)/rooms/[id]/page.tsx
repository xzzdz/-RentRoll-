import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, FileSignature, Wrench } from "lucide-react";
import { db } from "@/lib/db";
import { maskIdCard } from "@/lib/crypto";
import { bangkokToday } from "@/lib/period";
import { money, thDate, thDateTime, thPeriod } from "@/lib/format";
import { PageHead } from "@/components/PageHead";
import { SubmitButton } from "@/components/SubmitButton";
import { CONTRACT_STATUS, INVOICE_STATUS, MAINTENANCE_STATUS, ROOM_STATUS, StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoveOutDialog } from "./MoveOutDialog";
import { setRoomStatus } from "./actions";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 py-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const room = await db.room.findUnique({
    where: { id },
    include: {
      building: true,
      roomType: true,
      meters: { where: { isActive: true }, include: { readings: { orderBy: [{ periodMonth: "desc" }, { isInitial: "asc" }], take: 1 } } },
      contracts: {
        orderBy: { startDate: "desc" },
        take: 5,
        include: { tenants: { include: { tenant: true }, orderBy: { isPrimary: "desc" } }, fees: { include: { feeItem: true } } },
      },
    },
  });
  if (!room) notFound();

  const active = room.contracts.find((c) => c.status === "ACTIVE");
  const invoices = await db.invoice.findMany({
    where: { contract: { roomId: room.id }, status: { not: "VOID" } },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { period: true },
  });
  const jobs = await db.maintenanceRequest.findMany({
    where: { roomId: room.id },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { assignedTo: { select: { name: true } } },
  });
  const today = bangkokToday().toISOString().slice(0, 10);
  const water = room.meters.find((m) => m.utility === "WATER");
  const electric = room.meters.find((m) => m.utility === "ELECTRIC");

  return (
    <>
      <Link href={`/rooms?b=${room.buildingId}`} className="text-muted-foreground mb-2 inline-flex items-center gap-1 text-sm hover:underline">
        <ChevronLeft className="size-4" /> {room.building.name}
      </Link>
      <PageHead
        title={`ห้อง ${room.number}`}
        sub={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge map={ROOM_STATUS[room.status]} /> {room.roomType.name} · ชั้น {room.floor} · ค่าเช่าตั้งต้น{" "}
            {money((room.rentOverride ?? room.roomType.baseRent).toNumber(), 0)} บาท
          </span>
        }
      >
        <Button variant="outline" asChild>
          <Link href={`/maintenance/new?room=${room.id}`}>
            <Wrench /> แจ้งซ่อม
          </Link>
        </Button>
        {active ? (
          <MoveOutDialog
            contractId={active.id}
            roomNumber={room.number}
            today={today}
            deposit={active.depositAmount.toNumber()}
            hasWater={!!water}
            hasElectric={!!electric}
          />
        ) : (
          <>
            <form action={setRoomStatus} className="flex items-center gap-2">
              <input type="hidden" name="roomId" value={room.id} />
              <Select name="status" defaultValue={room.status === "OCCUPIED" ? "VACANT" : room.status}>
                <SelectTrigger className="w-40" aria-label="สถานะห้อง">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VACANT">ว่าง</SelectItem>
                  <SelectItem value="RESERVED">จองแล้ว</SelectItem>
                  <SelectItem value="MAINTENANCE">ปิดปรับปรุง</SelectItem>
                </SelectContent>
              </Select>
              <SubmitButton variant="outline">เปลี่ยนสถานะ</SubmitButton>
            </form>
            <Button asChild>
              <Link href={`/contracts/new?room=${room.id}`}>
                <FileSignature /> ทำสัญญาใหม่
              </Link>
            </Button>
          </>
        )}
      </PageHead>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle>{active ? "ผู้เช่าและสัญญาปัจจุบัน" : "ยังไม่มีผู้เช่า"}</CardTitle>
            {active && (
              <CardAction>
                <StatusBadge map={CONTRACT_STATUS[active.status]} />
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            {active ? (
              <div className="grid gap-x-8 sm:grid-cols-2">
                <dl>
                  {active.tenants.map((t) => (
                    <Row key={t.tenantId} label={t.isPrimary ? "ผู้เช่าหลัก" : "ผู้อยู่ร่วม"}>
                      <b>{t.tenant.fullName}</b>
                      <div className="num text-muted-foreground">{t.tenant.phone}</div>
                    </Row>
                  ))}
                  <Row label="เลขบัตร">{maskIdCard(active.tenants[0]?.tenant.idCardNo ?? null) ?? "—"}</Row>
                  <Row label="ติดต่อฉุกเฉิน">
                    {active.tenants[0]?.tenant.emergencyName ?? "—"} <span className="num">{active.tenants[0]?.tenant.emergencyPhone ?? ""}</span>
                  </Row>
                  <Row label="LINE">{active.tenants[0]?.tenant.userId ? "ผูกบัญชีแล้ว" : `ยังไม่ผูก · โค้ดเชิญ ${active.tenants[0]?.tenant.inviteCode ?? "-"}`}</Row>
                </dl>
                <dl>
                  <Row label="เลขที่สัญญา">
                    <span className="num">{active.contractNo}</span>
                  </Row>
                  <Row label="ระยะเวลา">
                    {thDate(active.startDate)} – {active.endDate ? thDate(active.endDate) : "ไม่กำหนด"}
                  </Row>
                  <Row label="ค่าเช่า">
                    <span className="num">{money(active.monthlyRent.toNumber())}</span> บาท/เดือน
                  </Row>
                  <Row label="เงินประกัน">
                    <span className="num">{money(active.depositAmount.toNumber())}</span> บาท
                  </Row>
                  <Row label="ค่าบริการ">
                    {active.fees.length
                      ? active.fees.map((f) => `${f.feeItem.name} ${money((f.amount ?? f.feeItem.amount).toNumber(), 0)}`).join(" · ")
                      : "—"}
                  </Row>
                </dl>
              </div>
            ) : (
              <p className="text-muted-foreground">ทำสัญญาใหม่แล้วจดเลขมิเตอร์ตั้งต้น ระบบจะใช้เป็นเลขครั้งก่อนของบิลเดือนแรก</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>มิเตอร์ล่าสุด</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {(
              [
                ["น้ำ", water],
                ["ไฟ", electric],
              ] as const
            ).map(([label, m]) =>
              m ? (
                <div key={label} className="flex items-baseline justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span>
                    <b className="num text-lg">{m.readings[0] ? money(m.readings[0].value.toNumber(), 0) : "—"}</b>
                    {m.readings[0] && (
                      <span className="text-subtle ml-2 text-xs">
                        {m.readings[0].isInitial ? "ตั้งต้น" : "รอบ"} {thPeriod(m.readings[0].periodMonth)}
                      </span>
                    )}
                  </span>
                </div>
              ) : null,
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="border-b">
            <CardTitle>บิลของห้องนี้</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">เลขที่</TableHead>
                <TableHead>รอบ</TableHead>
                <TableHead className="text-right">ยอดรวม</TableHead>
                <TableHead className="text-right">ชำระแล้ว</TableHead>
                <TableHead>ครบกำหนด</TableHead>
                <TableHead>สถานะ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="pl-5">
                    <Link href={`/billing/${i.id}`} className="num text-primary hover:underline">
                      {i.invoiceNo}
                    </Link>
                  </TableCell>
                  <TableCell>{i.period ? thPeriod(i.period.periodMonth) : "นอกรอบ"}</TableCell>
                  <TableCell className="num text-right">{money(i.total.toNumber())}</TableCell>
                  <TableCell className="num text-right">{money(i.paidAmount.toNumber())}</TableCell>
                  <TableCell>{i.dueDate ? thDate(i.dueDate) : "—"}</TableCell>
                  <TableCell>
                    <StatusBadge map={INVOICE_STATUS[i.status]} />
                  </TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-6 text-center">
                    ยังไม่มีบิล
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="border-b">
            <CardTitle>งานแจ้งซ่อม</CardTitle>
            <CardAction>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/maintenance/new?room=${room.id}`}>เปิดงานใหม่</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-2">
            {jobs.length === 0 && <p className="text-muted-foreground">ยังไม่มีงานแจ้งซ่อมของห้องนี้</p>}
            {jobs.map((j) => (
              <div key={j.id} className="flex flex-wrap items-center gap-3 text-sm">
                <StatusBadge map={MAINTENANCE_STATUS[j.status]} />
                <Link href={`/maintenance/${j.id}`} className="flex-1 hover:underline">
                  {j.title} <span className="text-subtle num text-xs">{j.ticketNo}</span>
                </Link>
                <span className="text-muted-foreground">{j.assignedTo?.name ?? "ยังไม่มอบหมาย"}</span>
                {j.cost && (
                  <span className="num text-muted-foreground">
                    {money(j.cost.toNumber(), 0)} บาท{j.chargeTenant ? " (เก็บผู้เช่า)" : ""}
                  </span>
                )}
                <span className="text-subtle text-xs">{thDateTime(j.createdAt, false)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {room.contracts.filter((c) => c.status !== "ACTIVE").length > 0 && (
          <Card className="lg:col-span-3">
            <CardHeader className="border-b">
              <CardTitle>ประวัติสัญญา</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {room.contracts
                .filter((c) => c.status !== "ACTIVE")
                .map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="num text-muted-foreground">{c.contractNo}</span>
                    <span>{c.tenants[0]?.tenant.fullName}</span>
                    <span className="text-muted-foreground">
                      {thDate(c.startDate)} – {c.moveOutDate ? thDate(c.moveOutDate) : c.endDate ? thDate(c.endDate) : "-"}
                    </span>
                    {c.depositRefund && <span className="text-muted-foreground">คืนประกัน {money(c.depositRefund.toNumber(), 0)} บาท</span>}
                    <StatusBadge map={CONTRACT_STATUS[c.status]} />
                  </div>
                ))}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

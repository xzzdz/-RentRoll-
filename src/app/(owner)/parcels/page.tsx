import { Package, Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { currentPropertyId } from "@/lib/auth";
import { bangkokToday } from "@/lib/period";
import { thDateTime } from "@/lib/format";
import { STALE_DAYS, daysWaiting } from "@/lib/parcel";
import { cn } from "@/lib/utils";
import { PageHead } from "@/components/PageHead";
import { LinkTabs } from "@/components/LinkTabs";
import { PARCEL_STATUS, StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ParcelForm } from "./ParcelForm";
import { DeleteParcel, HandOverDialog, ReturnDialog } from "./ParcelActions";

export const metadata = { title: "พัสดุ" };

const TABS = [
  { key: "waiting", label: "รอรับ" },
  { key: "done", label: "ประวัติ" },
  { key: "all", label: "ทั้งหมด" },
];

export default async function ParcelsPage({ searchParams }: { searchParams: Promise<{ q?: string; s?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const tab = TABS.some((t) => t.key === sp.s) ? sp.s! : "waiting";
  const propertyId = await currentPropertyId();
  const today = bangkokToday();

  const status: Prisma.ParcelWhereInput =
    tab === "waiting" ? { status: "WAITING" } : tab === "done" ? { status: { in: ["PICKED_UP", "RETURNED"] } } : {};

  // ค้นได้ทั้งชื่อหน้ากล่อง เลขพัสดุ และเลขห้อง — คนมารับมักจำได้อย่างใดอย่างหนึ่ง
  const search: Prisma.ParcelWhereInput = q
    ? {
        OR: [
          { recipient: { contains: q, mode: "insensitive" } },
          { trackingNo: { contains: q, mode: "insensitive" } },
          { room: { number: { contains: q, mode: "insensitive" } } },
        ],
      }
    : {};

  const [parcels, rooms, waiting] = await Promise.all([
    db.parcel.findMany({
      where: { propertyId, ...status, ...search },
      orderBy: [{ status: "asc" }, { receivedAt: "desc" }],
      take: 200,
      include: { room: { select: { number: true } }, receivedBy: { select: { name: true } }, handedOverBy: { select: { name: true } } },
    }),
    db.room.findMany({ where: { building: { propertyId } }, orderBy: { number: "asc" }, select: { number: true } }),
    db.parcel.findMany({ where: { propertyId, status: "WAITING" }, select: { receivedAt: true } }),
  ]);

  const stale = waiting.filter((p) => daysWaiting(p.receivedAt, today) >= STALE_DAYS).length;
  const todayIn = waiting.filter((p) => daysWaiting(p.receivedAt, today) === 0).length;
  const href = (s: string) => `/parcels?s=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHead title="พัสดุ" sub="ของที่หอรับฝากไว้ให้ผู้เช่า — ตอบได้ทันทีว่าของมาถึงหรือยัง และใครรับไป" />

      <div className="mb-4 grid grid-cols-3 gap-3">
        {[
          { label: "รอให้มารับ", value: waiting.length, tone: "" },
          { label: `ค้างเกิน ${STALE_DAYS} วัน`, value: stale, tone: stale > 0 ? "text-destructive" : "" },
          { label: "รับเข้าวันนี้", value: todayIn, tone: "" },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="grid gap-0.5">
              <span className="eyebrow">{k.label}</span>
              <b className={cn("num font-display text-2xl leading-tight", k.tone)}>{k.value}</b>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4">
        <ParcelForm roomNumbers={rooms.map((r) => r.number)} />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <LinkTabs label="กรองตามสถานะ" current={tab} items={TABS.map((t) => ({ ...t, href: href(t.key) }))} />
          <form action="/parcels" className="flex items-center gap-1.5">
            <input type="hidden" name="s" value={tab} />
            <div className="relative">
              <Search className="text-subtle pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" aria-hidden />
              <Input name="q" defaultValue={q} placeholder="ชื่อ เลขห้อง หรือเลขพัสดุ" aria-label="ค้นหาพัสดุ" className="w-[210px] pl-8" />
            </div>
            <Button type="submit" variant="outline">
              ค้นหา
            </Button>
          </form>
        </div>

        {parcels.length === 0 ? (
          <div className="bg-card grid justify-items-center gap-2 rounded-xl border border-dashed p-10 text-center">
            <Package className="text-subtle size-7" aria-hidden />
            <p className="text-muted-foreground">
              {q ? `ไม่พบพัสดุที่ตรงกับ “${q}”` : tab === "waiting" ? "ไม่มีพัสดุค้างรออยู่" : "ยังไม่มีประวัติพัสดุ"}
            </p>
          </div>
        ) : (
          <>
            {/* จอเล็กเป็นการ์ด — คนรับของใช้มือถือยืนหน้าเคาน์เตอร์ */}
            <div className="grid gap-2 lg:hidden">
              {parcels.map((p) => {
                const days = daysWaiting(p.receivedAt, today);
                const late = p.status === "WAITING" && days >= STALE_DAYS;
                return (
                  <Card key={p.id} className={cn(late && "shadow-[inset_3px_0_0_var(--destructive)]")}>
                    <CardContent className="grid gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <b className="font-display block truncate text-[15px]">
                            {p.room ? <span className="num">{p.room.number}</span> : <span className="text-subtle">ไม่ระบุห้อง</span>} · {p.recipient}
                          </b>
                          <span className="text-subtle text-xs">
                            รับเข้า {thDateTime(p.receivedAt)}
                            {p.status === "WAITING" && days > 0 && ` · ค้าง ${days} วัน`}
                          </span>
                        </div>
                        <StatusBadge map={PARCEL_STATUS[p.status]} />
                      </div>

                      <ParcelDetail carrier={p.carrier} trackingNo={p.trackingNo} size={p.size} note={p.note} />

                      {p.status === "WAITING" ? (
                        <div className="flex flex-wrap items-center gap-1.5 border-t pt-2">
                          <HandOverDialog parcel={{ id: p.id, recipient: p.recipient, roomNumber: p.room?.number ?? null }} />
                          <ReturnDialog parcel={{ id: p.id, recipient: p.recipient, roomNumber: p.room?.number ?? null }} />
                          <span className="ml-auto">
                            <DeleteParcel parcel={{ id: p.id, recipient: p.recipient, roomNumber: p.room?.number ?? null }} />
                          </span>
                        </div>
                      ) : (
                        <span className="text-subtle border-t pt-2 text-xs">
                          {p.status === "PICKED_UP" ? `${p.collectedBy ?? p.recipient} รับไป` : "ตีกลับผู้ส่ง"}
                          {p.pickedUpAt ? ` · ${thDateTime(p.pickedUpAt)}` : ""}
                          {p.handedOverBy ? ` · จ่ายโดย ${p.handedOverBy.name}` : ""}
                        </span>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* จอใหญ่เป็นตาราง — กวาดตาหาห้องได้เร็วกว่า */}
            <Card className="hidden lg:block">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>รับเข้า</TableHead>
                      <TableHead>ห้อง</TableHead>
                      <TableHead>ผู้รับ</TableHead>
                      <TableHead>ขนส่ง / เลขพัสดุ</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parcels.map((p) => {
                      const days = daysWaiting(p.receivedAt, today);
                      const late = p.status === "WAITING" && days >= STALE_DAYS;
                      const who = { id: p.id, recipient: p.recipient, roomNumber: p.room?.number ?? null };
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="whitespace-nowrap">
                            <span className="text-[13px]">{thDateTime(p.receivedAt)}</span>
                            {late && (
                              <Badge variant="bad" className="ml-1.5">
                                ค้าง {days} วัน
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="num font-semibold">{p.room?.number ?? <span className="text-subtle font-normal">—</span>}</TableCell>
                          <TableCell>
                            {p.recipient}
                            {p.note && <span className="text-subtle block text-xs">{p.note}</span>}
                          </TableCell>
                          <TableCell className="text-[13px]">
                            {p.carrier ?? "—"}
                            {p.trackingNo && <span className="num text-subtle block text-xs">{p.trackingNo}</span>}
                            {p.size && <span className="text-subtle block text-xs">{p.size}</span>}
                          </TableCell>
                          <TableCell>
                            <StatusBadge map={PARCEL_STATUS[p.status]} />
                            {p.status !== "WAITING" && (
                              <span className="text-subtle block text-xs">
                                {p.status === "PICKED_UP" ? `${p.collectedBy ?? p.recipient} รับไป` : "ตีกลับ"}
                                {p.pickedUpAt ? ` · ${thDateTime(p.pickedUpAt, false)}` : ""}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1.5">
                              {p.status === "WAITING" && (
                                <>
                                  <HandOverDialog parcel={who} />
                                  <ReturnDialog parcel={who} />
                                </>
                              )}
                              <DeleteParcel parcel={who} />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function ParcelDetail({ carrier, trackingNo, size, note }: { carrier: string | null; trackingNo: string | null; size: string | null; note: string | null }) {
  const bits = [carrier, size].filter(Boolean).join(" · ");
  if (!bits && !trackingNo && !note) return null;
  return (
    <div className="text-muted-foreground grid gap-0.5 text-[13px]">
      {bits && <span>{bits}</span>}
      {trackingNo && <span className="num text-xs">{trackingNo}</span>}
      {note && <span className="text-subtle text-xs">{note}</span>}
    </div>
  );
}

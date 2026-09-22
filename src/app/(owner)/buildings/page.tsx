import Link from "next/link";
import type { RoomStatus } from "@prisma/client";
import { Building2, ChevronRight, Layers, LayoutGrid } from "lucide-react";
import { db } from "@/lib/db";
import { currentPropertyId } from "@/lib/auth";
import { ROOM_BAR, ROOM_TILE } from "@/lib/room-style";
import { cn } from "@/lib/utils";
import { PageHead } from "@/components/PageHead";
import { ROOM_STATUS } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AddBuildingForm } from "./AddBuildingForm";

export const metadata = { title: "ตึกและชั้น" };

const ORDER: RoomStatus[] = ["OCCUPIED", "RESERVED", "MAINTENANCE", "VACANT"];

export default async function BuildingsPage() {
  const propertyId = await currentPropertyId();
  const buildings = await db.building.findMany({
    where: { propertyId },
    orderBy: { sortOrder: "asc" },
    include: { rooms: { select: { status: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHead title="ตึกและชั้น" sub="เพิ่มตึก สร้างห้องเป็นชุด และจัดผังแต่ละชั้น" />

      <div className="grid gap-3">
        <AddBuildingForm />

        {buildings.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 px-1 text-[12px]">
            <span className="eyebrow">สถานะห้อง</span>
            {ORDER.map((s) => (
              <span key={s} className="text-muted-foreground inline-flex items-center gap-1.5">
                <i className={cn("inline-block size-3.5 rounded border", ROOM_TILE[s])} />
                {ROOM_STATUS[s][1]}
              </span>
            ))}
          </div>
        )}

        {buildings.map((b) => {
          const total = b.rooms.length;
          const count = (s: RoomStatus) => b.rooms.filter((r) => r.status === s).length;

          return (
            <Link key={b.id} href={`/buildings/${b.id}`} className="rounded-xl">
              <Card className="hover:border-primary/50 transition-colors">
                <CardContent className="grid gap-2.5">
                  <div className="flex items-center gap-3">
                    {/* ไอคอนเป็นของตกแต่ง ไม่ใช่ปุ่ม จึงไม่ใช้สีแบรนด์ */}
                    <span className="bg-muted text-muted-foreground grid size-11 shrink-0 place-items-center rounded-xl">
                      <Building2 className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <b className="font-display text-[15px]">{b.name}</b>
                      {b.code && <span className="text-subtle num text-[12px]"> · {b.code}</span>}
                      <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-[12.5px]">
                        <span className="inline-flex items-center gap-1">
                          <Layers className="size-3.5" aria-hidden /> {b.floors} ชั้น
                        </span>
                        <span>· {total} ห้อง</span>
                      </div>
                    </div>
                    {total === 0 && <Badge variant="warn">ยังไม่มีห้อง</Badge>}
                    {b.floorPlan != null && (
                      <Badge variant="info">
                        <LayoutGrid className="size-3" aria-hidden /> จัดผังแล้ว
                      </Badge>
                    )}
                    <ChevronRight className="text-subtle size-4 shrink-0" aria-hidden />
                  </div>

                  {/* สัดส่วนห้องด้วยสีชุดเดียวกับผังห้อง — เห็นสุขภาพตึกทันทีโดยไม่ต้องกดเข้าไป */}
                  {total > 0 && (
                    <div className="grid gap-1">
                      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={ORDER.map((s) => `${ROOM_STATUS[s][1]} ${count(s)}`).join(", ")}>
                        {ORDER.filter((s) => count(s) > 0).map((s) => (
                          <i key={s} className={cn("block", ROOM_BAR[s])} style={{ width: `${(count(s) / total) * 100}%` }} />
                        ))}
                      </div>
                      <div className="text-subtle flex flex-wrap gap-x-2.5 text-[11.5px]">
                        {ORDER.filter((s) => count(s) > 0).map((s) => (
                          <span key={s}>
                            {ROOM_STATUS[s][1]} <b className="num">{count(s)}</b>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {buildings.length === 0 && (
          <p className="bg-card text-muted-foreground rounded-xl border border-dashed p-6 text-center">
            ยังไม่มีตึก — เพิ่มตึกแรกด้านบน แล้วค่อยสร้างห้องเป็นชุด
          </p>
        )}
      </div>
    </div>
  );
}

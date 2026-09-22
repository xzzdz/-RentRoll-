import Link from "next/link";
import type { RoomStatus } from "@prisma/client";
import { Banknote, PencilRuler, Wrench } from "lucide-react";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { CELL_META, parsePlan, rowsOf } from "@/lib/floorplan";
import { cn } from "@/lib/utils";
import { PageHead } from "@/components/PageHead";
import { BuildingTabs } from "@/components/BuildingTabs";
import { CellContent, PlanLegend } from "@/components/FloorPlanCell";
import { ROOM_STATUS } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";

/**
 * สีบอกสถานะห้องแบบเห็นปราดเดียว — เขียวคือห้องทำรายได้ เหลืองคือกำลังจะเข้า
 * ขาวขอบประคือยังว่าง เทาลายทแยงคือใช้ไม่ได้
 */
const TILE: Record<RoomStatus, string> = {
  OCCUPIED: "bg-room-live text-room-live-fg border-room-live-bd",
  VACANT: "bg-card text-room-free-fg border-room-free-bd border-dashed",
  RESERVED: "bg-room-hold text-room-hold-fg border-room-hold-bd",
  MAINTENANCE: "bg-room-closed text-room-closed-fg border-room-closed-bd hatch",
};

/** ค้างชำระทับสีสถานะเดิมเสมอ เพราะเป็นสิ่งที่เจ้าของต้องเห็นก่อนอย่างอื่น */
const TILE_OVERDUE = "bg-room-due text-room-due-fg border-room-due-bd";

type RoomTile = {
  id: string;
  number: string;
  floor: number;
  status: RoomStatus;
  tenant: string | null;
  rent: number;
  typeName: string;
  overdue: boolean;
  repair: boolean;
};

export default async function RoomsPage({ searchParams }: { searchParams: Promise<{ b?: string }> }) {
  const { b } = await searchParams;
  const property = await db.property.findFirstOrThrow({ select: { id: true } });
  const buildings = await db.building.findMany({ where: { propertyId: property.id }, orderBy: { sortOrder: "asc" } });
  const building = buildings.find((x) => x.id === b) ?? buildings[0];

  if (!building) {
    return (
      <>
        <PageHead title="ผังห้อง" />
        <div className="bg-card grid justify-items-center gap-3 rounded-xl border border-dashed p-8 text-center">
          <p className="text-muted-foreground">ยังไม่มีตึกในระบบ</p>
          <Button asChild>
            <Link href="/buildings">เพิ่มตึกแรก</Link>
          </Button>
        </div>
      </>
    );
  }

  const rooms = await db.room.findMany({
    where: { buildingId: building.id },
    orderBy: [{ floor: "desc" }, { number: "asc" }],
    include: {
      roomType: true,
      contracts: { where: { status: "ACTIVE" }, take: 1, include: { tenants: { where: { isPrimary: true }, include: { tenant: true } } } },
      _count: { select: { maintenance: { where: { status: { in: ["NEW", "ASSIGNED", "IN_PROGRESS"] } } } } },
    },
  });
  const overdueIds = new Set(
    (
      await db.invoice.findMany({
        where: { status: { in: ["OVERDUE", "PARTIAL"] }, contract: { room: { buildingId: building.id } } },
        select: { contract: { select: { roomId: true } } },
      })
    ).map((i) => i.contract.roomId),
  );

  const tiles: RoomTile[] = rooms.map((r) => ({
    id: r.id,
    number: r.number,
    floor: r.floor,
    status: r.status,
    tenant: r.contracts[0]?.tenants[0]?.tenant.fullName ?? null,
    rent: (r.rentOverride ?? r.roomType.baseRent).toNumber(),
    typeName: r.roomType.name,
    overdue: overdueIds.has(r.id),
    repair: r._count.maintenance > 0,
  }));

  const byId = new Map(tiles.map((t) => [t.id, t]));
  const plan = parsePlan(building.floorPlan);
  const floors = [...new Set(tiles.map((t) => t.floor))].sort((a, b) => b - a);
  const count = (s: RoomStatus) => tiles.filter((t) => t.status === s).length;
  const overdueCount = tiles.filter((t) => t.overdue).length;
  const repairCount = tiles.filter((t) => t.repair).length;

  return (
    <>
      <PageHead title="ผังห้อง" sub={`${building.name} · ${tiles.length} ห้อง · ว่าง ${count("VACANT")} ห้อง`}>
        <BuildingTabs buildings={buildings} current={building.id} basePath="/rooms" />
        <Button variant="outline" asChild>
          <Link href={`/buildings/${building.id}?tab=plan`}>
            <PencilRuler /> จัดผัง
          </Link>
        </Button>
      </PageHead>

      <div className="bg-card rounded-xl border">
        {/* คำอธิบายสัญลักษณ์ — สถานะห้องมาก่อน แล้วค่อยธงที่ทับอยู่บนห้อง */}
        <div className="grid gap-2 border-b px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 text-[12px]">
            <span className="eyebrow">สถานะห้อง</span>
            {(Object.keys(TILE) as RoomStatus[]).map((s) => (
              <span key={s} className="text-muted-foreground inline-flex items-center gap-1.5">
                <i className={cn("inline-block size-4 rounded border", TILE[s])} />
                {ROOM_STATUS[s][1]} <span className="num">({count(s)})</span>
              </span>
            ))}
            <span className="text-muted-foreground inline-flex items-center gap-1.5">
              <i className={cn("inline-block size-4 rounded border", TILE_OVERDUE)} />
              ค้างชำระ <span className="num">({overdueCount})</span>
            </span>
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3.5 gap-y-2 border-t pt-2 text-[12px]">
            <span className="eyebrow">สัญลักษณ์บนห้อง</span>
            <span className="inline-flex items-center gap-1.5">
              <Banknote className="text-room-due-fg size-3.5" aria-hidden /> ค้างชำระ
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Wrench className="text-room-hold-fg size-3.5" aria-hidden /> มีงานซ่อม <span className="num">({repairCount})</span>
            </span>
          </div>
        </div>

        <div className="grid gap-1 p-3 lg:p-4">
          {tiles.length === 0 && (
            <div className="grid justify-items-center gap-3 py-10 text-center">
              <p className="text-muted-foreground">ตึกนี้ยังไม่มีห้อง</p>
              <Button asChild>
                <Link href={`/buildings/${building.id}`}>สร้างห้องเป็นชุด</Link>
              </Button>
            </div>
          )}

          {floors.map((f) => {
            const cells = plan?.floors[String(f)];
            const floorRooms = tiles.filter((t) => t.floor === f);

            return (
              <section key={f} className="grid gap-1.5 border-t border-dashed py-2.5 first:border-0 first:pt-0">
                <div className="text-subtle font-display text-[13px] font-semibold">
                  ชั้น {f} <span className="text-[11px] font-normal">· {floorRooms.length} ห้อง</span>
                </div>

                {cells && plan ? (
                  /* ผังที่จัดไว้เอง — ห้องเป็นสีสด พื้นที่ส่วนกลางเป็นสีเย็นจาง + ไอคอน */
                  <div className="overflow-x-auto">
                    <div
                      className="grid gap-1"
                      style={{
                        gridTemplateColumns: `repeat(${plan.cols}, minmax(48px, 1fr))`,
                        maxWidth: `${plan.cols * 92}px`,
                        gridTemplateRows: `repeat(${rowsOf(cells, plan.cols)}, auto)`,
                      }}
                    >
                      {cells.map((c, i) => {
                        const room = c.t === "ROOM" && c.roomId ? byId.get(c.roomId) : null;
                        if (room) return <Tile key={i} room={room} square />;
                        return (
                          <div
                            key={i}
                            title={c.t === "EMPTY" ? undefined : CELL_META[c.t].label}
                            className={cn("grid aspect-square place-items-center rounded-md border", CELL_META[c.t].className)}
                          >
                            <CellContent type={c.t} compact />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* ยังไม่ได้จัดผัง — เรียงอัตโนมัติ */
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-1.5">
                    {floorRooms.map((r) => (
                      <Tile key={r.id} room={r} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {plan && (
          <div className="border-t px-4 py-3">
            <PlanLegend />
          </div>
        )}
      </div>

      {!plan && tiles.length > 0 && (
        <p className="text-subtle mt-3 px-1 text-[12.5px]">
          อยากให้ผังตรงกับตึกจริง (มีทางเดิน บันได ลิฟต์)?{" "}
          <Link href={`/buildings/${building.id}?tab=plan`} className="text-primary hover:underline">
            จัดผังชั้นได้ที่นี่
          </Link>
        </p>
      )}
    </>
  );
}

function Tile({ room, square }: { room: RoomTile; square?: boolean }) {
  const flags = [room.overdue && "ค้างชำระ", room.repair && "มีงานซ่อม"].filter(Boolean).join(" · ");
  return (
    <Link
      href={`/rooms/${room.id}`}
      title={`${room.number} · ${room.typeName} · ${money(room.rent, 0)} บาท${room.tenant ? ` · ${room.tenant}` : ""}${flags ? ` · ${flags}` : ""}`}
      className={cn(
        "hover:ring-primary relative rounded-lg border px-1.5 py-1 transition-shadow hover:ring-2",
        square ? "grid aspect-square place-content-center text-center" : "min-h-[56px]",
        room.overdue ? TILE_OVERDUE : TILE[room.status],
      )}
    >
      <span className={cn("absolute flex gap-0.5", square ? "top-1 right-1" : "top-1.5 right-1.5")}>
        {room.overdue && <Banknote className="size-3.5" aria-label="ค้างชำระ" />}
        {room.repair && <Wrench className="text-room-hold-fg size-3.5" aria-label="มีงานซ่อม" />}
      </span>
      <span className="num block text-[13px] font-bold">{room.number}</span>
      {!square && <span className="block truncate text-[11px] opacity-80">{room.tenant ? room.tenant.split(" ")[0] : ROOM_STATUS[room.status][1]}</span>}
    </Link>
  );
}

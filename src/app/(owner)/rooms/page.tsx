import Link from "next/link";
import type { RoomStatus } from "@prisma/client";
import { PencilRuler } from "lucide-react";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { CELL_META, parsePlan, rowsOf } from "@/lib/floorplan";
import { cn } from "@/lib/utils";
import { PageHead } from "@/components/PageHead";
import { BuildingTabs } from "@/components/BuildingTabs";
import { ROOM_STATUS } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";

const TILE: Record<RoomStatus, string> = {
  OCCUPIED: "bg-accent text-accent-foreground border-transparent",
  VACANT: "border-dashed bg-transparent",
  RESERVED: "bg-warn-soft text-warn border-transparent",
  MAINTENANCE: "bg-bad-soft text-destructive border-transparent",
};

type RoomTile = {
  id: string;
  number: string;
  floor: number;
  status: RoomStatus;
  tenant: string | null;
  rent: number;
  typeName: string;
  flag: "overdue" | "repair" | null;
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
  const overdue = new Set(
    (
      await db.invoice.findMany({
        where: { status: "OVERDUE", contract: { room: { buildingId: building.id } } },
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
    flag: overdue.has(r.id) ? "overdue" : r._count.maintenance > 0 ? "repair" : null,
  }));
  const byId = new Map(tiles.map((t) => [t.id, t]));
  const plan = parsePlan(building.floorPlan);
  const floors = [...new Set(tiles.map((t) => t.floor))].sort((a, b) => b - a);
  const count = (s: RoomStatus) => tiles.filter((t) => t.status === s).length;

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
        <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1.5 border-b px-4 py-3 text-[12.5px]">
          {(Object.keys(TILE) as RoomStatus[]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <i className={cn("inline-block size-3.5 rounded border", TILE[s])} />
              {ROOM_STATUS[s][1]} <span className="num">({count(s)})</span>
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <i className="bg-destructive inline-block size-2 rounded-full" /> ค้างชำระ
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="bg-warn inline-block size-2 rounded-full" /> มีงานซ่อม
          </span>
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
                  /* ผังที่จัดไว้เอง — มีทางเดิน บันได ตามที่วาด */
                  <div className="overflow-x-auto">
                    <div
                      className="grid gap-1"
                      style={{
                        gridTemplateColumns: `repeat(${plan.cols}, minmax(42px, 1fr))`,
                        maxWidth: `${plan.cols * 88}px`,
                        gridTemplateRows: `repeat(${rowsOf(cells, plan.cols)}, auto)`,
                      }}
                    >
                      {cells.map((c, i) => {
                        const room = c.t === "ROOM" && c.roomId ? byId.get(c.roomId) : null;
                        if (!room) {
                          return (
                            <div
                              key={i}
                              className={cn(
                                "text-subtle grid aspect-square place-items-center rounded-md border text-[9.5px]",
                                CELL_META[c.t].className,
                              )}
                            >
                              {c.t === "EMPTY" ? "" : CELL_META[c.t].short}
                            </div>
                          );
                        }
                        return <Tile key={i} room={room} square />;
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
  return (
    <Link
      href={`/rooms/${room.id}`}
      title={`${room.number} · ${room.typeName} · ${money(room.rent, 0)} บาท${room.tenant ? ` · ${room.tenant}` : ""}`}
      className={cn(
        "hover:ring-primary relative rounded-md border px-1.5 py-1 transition-shadow hover:ring-2",
        square ? "grid aspect-square place-content-center text-center" : "min-h-[54px]",
        TILE[room.status],
      )}
    >
      {room.flag && (
        <i
          className={cn("absolute top-1 right-1 size-2 rounded-full", room.flag === "overdue" ? "bg-destructive" : "bg-warn")}
          aria-label={room.flag === "overdue" ? "ค้างชำระ" : "มีงานซ่อม"}
        />
      )}
      <span className="num block text-[12.5px] font-bold">{room.number}</span>
      {!square && (
        <span className="block truncate text-[11px] opacity-75">{room.tenant ? room.tenant.split(" ")[0] : ROOM_STATUS[room.status][1]}</span>
      )}
    </Link>
  );
}

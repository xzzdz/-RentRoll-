import Link from "next/link";
import type { RoomStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHead } from "@/components/PageHead";
import { BuildingTabs } from "@/components/BuildingTabs";
import { ROOM_STATUS } from "@/components/StatusBadge";

const TILE: Record<RoomStatus, string> = {
  OCCUPIED: "bg-accent border-transparent",
  VACANT: "border-dashed bg-transparent",
  RESERVED: "bg-warn-soft border-transparent",
  MAINTENANCE: "bg-bad-soft border-transparent",
};

export default async function RoomsPage({ searchParams }: { searchParams: Promise<{ b?: string }> }) {
  const { b } = await searchParams;
  const property = await db.property.findFirstOrThrow();
  const buildings = await db.building.findMany({ where: { propertyId: property.id }, orderBy: { sortOrder: "asc" } });
  const building = buildings.find((x) => x.id === b) ?? buildings[0];
  if (!building) return <p className="bg-card rounded-xl border p-6">ยังไม่มีตึก</p>;

  const rooms = await db.room.findMany({
    where: { buildingId: building.id },
    orderBy: [{ floor: "desc" }, { number: "asc" }],
    include: {
      roomType: true,
      contracts: { where: { status: "ACTIVE" }, take: 1, include: { tenants: { where: { isPrimary: true }, include: { tenant: true } } } },
      _count: { select: { maintenance: { where: { status: { in: ["NEW", "ASSIGNED", "IN_PROGRESS"] } } } } },
    },
  });
  const overdueRooms = new Set(
    (
      await db.invoice.findMany({
        where: { status: "OVERDUE", contract: { room: { buildingId: building.id } } },
        select: { contract: { select: { roomId: true } } },
      })
    ).map((i) => i.contract.roomId),
  );

  const floors = [...new Set(rooms.map((r) => r.floor))];
  const count = (s: RoomStatus) => rooms.filter((r) => r.status === s).length;

  return (
    <>
      <PageHead title="ผังห้อง" sub={`${building.name} · ${rooms.length} ห้อง · ว่าง ${count("VACANT")} ห้อง · กดที่ห้องเพื่อดูรายละเอียด`}>
        <BuildingTabs buildings={buildings} current={building.id} basePath="/rooms" />
      </PageHead>

      <div className="bg-card rounded-xl border">
        <div className="text-muted-foreground flex flex-wrap gap-4 border-b px-4 py-3 text-[12.5px]">
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
        <div className="p-4">
          {floors.map((f) => (
            <div key={f} className="grid grid-cols-[54px_1fr] items-center gap-2.5 border-t border-dashed py-2 first:border-0">
              <span className="text-subtle font-display text-[13px] font-semibold">ชั้น {f}</span>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-1.5">
                {rooms
                  .filter((r) => r.floor === f)
                  .map((r) => {
                    const tenant = r.contracts[0]?.tenants[0]?.tenant.fullName;
                    const rent = r.rentOverride ?? r.roomType.baseRent;
                    const flag = overdueRooms.has(r.id) ? "bg-destructive" : r._count.maintenance > 0 ? "bg-warn" : null;
                    return (
                      <Link
                        key={r.id}
                        href={`/rooms/${r.id}`}
                        title={`${r.number} · ${r.roomType.name} · ${money(rent.toNumber(), 0)} บาท`}
                        className={cn(
                          "hover:ring-primary relative min-h-[56px] rounded-lg border px-2 py-1.5 hover:ring-2",
                          TILE[r.status],
                        )}
                      >
                        {flag && <i className={cn("absolute top-1.5 right-1.5 size-2 rounded-full", flag)} />}
                        <span className="block font-display text-sm font-bold">{r.number}</span>
                        <span className="text-muted-foreground block truncate text-[11px]">
                          {tenant ? tenant.split(" ")[0] : ROOM_STATUS[r.status][1]}
                        </span>
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

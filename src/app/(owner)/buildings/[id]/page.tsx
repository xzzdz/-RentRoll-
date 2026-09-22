import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { currentPropertyId } from "@/lib/auth";
import { emptyPlan, parsePlan, prunePlan } from "@/lib/floorplan";
import { LinkTabs } from "@/components/LinkTabs";
import { PageHead } from "@/components/PageHead";
import { FloorPlanEditor } from "./FloorPlanEditor";
import { RoomGenerator } from "./RoomGenerator";
import { RoomList } from "./RoomList";
import { BuildingForm } from "./BuildingForm";

const TABS = [
  { key: "rooms", label: "ห้อง" },
  { key: "plan", label: "ผังชั้น" },
  { key: "settings", label: "ตั้งค่าตึก" },
];

export default async function BuildingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "rooms" } = await searchParams;
  const current = TABS.find((t) => t.key === tab) ?? TABS[0];

  // ต้องเป็นตึกในหอของผู้ใช้เท่านั้น ไม่งั้นรู้ id ก็เปิดดูผังและรายการห้องของหออื่นได้
  const propertyId = await currentPropertyId();
  const building = await db.building.findFirst({
    where: { id, propertyId },
    include: {
      rooms: {
        orderBy: [{ floor: "asc" }, { number: "asc" }],
        include: { roomType: { select: { name: true } }, _count: { select: { contracts: true, maintenance: true } } },
      },
    },
  });
  if (!building) notFound();

  const roomTypes = await db.roomType.findMany({
    where: { propertyId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const floors = Array.from({ length: building.floors }, (_, i) => i + 1);
  const validIds = new Set(building.rooms.map((r) => r.id));
  const stored = parsePlan(building.floorPlan);
  const plan = stored ? prunePlan(stored, validIds) : emptyPlan(floors);

  const rooms = building.rooms.map((r) => ({
    id: r.id,
    number: r.number,
    floor: r.floor,
    status: r.status,
    typeName: r.roomType.name,
    locked: r._count.contracts > 0 || r._count.maintenance > 0,
  }));

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/buildings" className="text-muted-foreground mb-2 inline-flex items-center gap-1 text-sm hover:underline">
        <ChevronLeft className="size-4" /> ตึกทั้งหมด
      </Link>
      <PageHead title={building.name} sub={`${building.floors} ชั้น · ${rooms.length} ห้อง`} />

      <LinkTabs
        label="ส่วนของตึก"
        current={current.key}
        className="mb-4"
        items={TABS.map((t) => ({ key: t.key, href: `/buildings/${id}?tab=${t.key}`, label: t.label }))}
      />

      {current.key === "rooms" && (
        <div className="grid gap-4">
          <RoomGenerator
            buildingId={id}
            floors={building.floors}
            defaultPrefix={building.code ? `${building.code}-` : ""}
            roomTypes={roomTypes}
            existing={rooms.length}
          />
          <RoomList rooms={rooms} floors={floors} />
        </div>
      )}

      {current.key === "plan" && <FloorPlanEditor buildingId={id} floors={floors} rooms={rooms} initialPlan={plan} />}

      {current.key === "settings" && (
        <BuildingForm
          building={{ id, name: building.name, code: building.code, floors: building.floors }}
          roomCount={rooms.length}
        />
      )}
    </div>
  );
}

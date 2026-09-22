import { db } from "@/lib/db";
import { currentPropertyId } from "@/lib/auth";
import { bangkokToday } from "@/lib/period";
import { CATEGORIES } from "@/lib/maintenance";
import { PageHead } from "@/components/PageHead";
import { RequestForm, type RoomOption, type TechOption } from "./RequestForm";

export default async function NewMaintenancePage({ searchParams }: { searchParams: Promise<{ room?: string }> }) {
  const { room } = await searchParams;
  const propertyId = await currentPropertyId();

  const [rooms, techs] = await Promise.all([
    db.room.findMany({
      where: { building: { propertyId } },
      orderBy: [{ building: { sortOrder: "asc" } }, { number: "asc" }],
      include: {
        building: { select: { name: true } },
        contracts: { where: { status: "ACTIVE" }, include: { tenants: { where: { isPrimary: true }, include: { tenant: true } } } },
      },
    }),
    db.user.findMany({ where: { role: "TECHNICIAN", isActive: true, propertyId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const roomOptions: RoomOption[] = rooms.map((r) => ({
    id: r.id,
    number: r.number,
    building: r.building.name,
    tenant: r.contracts[0]?.tenants[0]?.tenant.fullName ?? null,
  }));

  return (
    <>
      <PageHead title="เปิดงานแจ้งซ่อม" sub="ระบบออกเลขที่งานให้อัตโนมัติ · มอบหมายช่างตอนนี้หรือทีหลังก็ได้" />
      <RequestForm
        rooms={roomOptions}
        techs={techs as TechOption[]}
        categories={CATEGORIES}
        defaultRoomId={room}
        today={bangkokToday().toISOString().slice(0, 10)}
      />
    </>
  );
}

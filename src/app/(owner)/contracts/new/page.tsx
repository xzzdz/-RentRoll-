import { db } from "@/lib/db";
import { currentPropertyId } from "@/lib/auth";
import { bangkokToday } from "@/lib/period";
import { PageHead } from "@/components/PageHead";
import { ContractForm, type FeeOption, type RoomOption } from "./ContractForm";

export default async function NewContractPage({ searchParams }: { searchParams: Promise<{ room?: string }> }) {
  const { room } = await searchParams;
  const property = await db.property.findUniqueOrThrow({ where: { id: await currentPropertyId() } });

  const [rooms, feeItems] = await Promise.all([
    db.room.findMany({
      where: { building: { propertyId: property.id }, status: { in: ["VACANT", "RESERVED"] }, contracts: { none: { status: "ACTIVE" } } },
      orderBy: [{ building: { sortOrder: "asc" } }, { number: "asc" }],
      include: {
        building: true,
        roomType: true,
        meters: { where: { isActive: true }, include: { readings: { orderBy: [{ periodMonth: "desc" }, { isInitial: "asc" }], take: 1 } } },
      },
    }),
    db.feeItem.findMany({ where: { propertyId: property.id, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const last = (r: (typeof rooms)[number], u: "WATER" | "ELECTRIC") => r.meters.find((m) => m.utility === u)?.readings[0]?.value.toNumber() ?? null;

  const roomOptions: RoomOption[] = rooms.map((r) => ({
    id: r.id,
    number: r.number,
    building: r.building.name,
    typeName: r.roomType.name,
    rent: (r.rentOverride ?? r.roomType.baseRent).toNumber(),
    deposit: r.roomType.deposit.toNumber(),
    status: r.status,
    lastWater: last(r, "WATER"),
    lastElectric: last(r, "ELECTRIC"),
    hasWater: r.meters.some((m) => m.utility === "WATER"),
    hasElectric: r.meters.some((m) => m.utility === "ELECTRIC"),
  }));
  const fees: FeeOption[] = feeItems.map((f) => ({ id: f.id, name: f.name, amount: f.amount.toNumber(), isDefault: f.isDefault, charge: f.charge }));

  return (
    <>
      <PageHead title="ทำสัญญาใหม่" sub={`ห้องว่าง/จองแล้ว ${roomOptions.length} ห้อง · บันทึกแล้วห้องจะเปลี่ยนเป็น "มีผู้เช่า"`} />
      {roomOptions.length === 0 ? (
        <p className="bg-card text-muted-foreground rounded-xl border p-6">ไม่มีห้องว่าง</p>
      ) : (
        <ContractForm rooms={roomOptions} fees={fees} defaultRoomId={room} today={bangkokToday().toISOString().slice(0, 10)} />
      )}
    </>
  );
}

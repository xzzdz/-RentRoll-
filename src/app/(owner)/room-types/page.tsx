import { db } from "@/lib/db";
import { PageHead } from "@/components/PageHead";
import { RoomTypeCard } from "./RoomTypeCard";
import { AddRoomTypeForm } from "./AddRoomTypeForm";

export default async function RoomTypesPage() {
  const property = await db.property.findFirstOrThrow({ select: { id: true } });
  const types = await db.roomType.findMany({
    where: { propertyId: property.id },
    orderBy: { baseRent: "asc" },
    include: { _count: { select: { rooms: true } } },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHead
        title="ประเภทห้อง"
        sub="ค่าเช่าและเงินประกันตั้งต้นของแต่ละแบบ · ตอนทำสัญญาปรับเป็นรายห้องได้"
      />

      <div className="grid gap-3">
        <AddRoomTypeForm />
        {types.map((t) => (
          <RoomTypeCard
            key={t.id}
            type={{
              id: t.id,
              name: t.name,
              baseRent: t.baseRent.toNumber(),
              deposit: t.deposit.toNumber(),
              description: t.description,
              roomCount: t._count.rooms,
            }}
          />
        ))}
        {types.length === 0 && (
          <p className="bg-card text-muted-foreground rounded-xl border border-dashed p-6 text-center">
            ยังไม่มีประเภทห้อง — เพิ่มอย่างน้อยหนึ่งแบบก่อนจึงจะสร้างห้องได้
          </p>
        )}
      </div>
    </div>
  );
}

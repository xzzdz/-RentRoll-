import { db } from "@/lib/db";
import { currentPropertyId } from "@/lib/auth";
import { bangkokToday } from "@/lib/period";
import { thDate, thDateTime } from "@/lib/format";
import { PageHead } from "@/components/PageHead";
import { AnnouncementForm } from "./AnnouncementForm";
import { AnnouncementRow } from "./AnnouncementRow";

export const metadata = { title: "บอร์ดประกาศ" };

export default async function AnnouncementsPage() {
  const propertyId = await currentPropertyId();
  const today = bangkokToday();

  const [items, buildings] = await Promise.all([
    db.announcement.findMany({
      where: { propertyId },
      orderBy: [{ pinned: "desc" }, { publishedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
      include: { building: { select: { name: true } } },
    }),
    db.building.findMany({ where: { propertyId }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);

  const live = items.filter((a) => a.publishedAt && (!a.expiresAt || a.expiresAt >= today)).length;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHead
        title="บอร์ดประกาศ"
        sub={`ประกาศที่แสดงอยู่ตอนนี้ ${live} เรื่อง · เมื่อต่อ LINE แล้วประกาศจะถูกส่งถึงผู้เช่าโดยตรง`}
      />

      <div className="grid gap-3">
        <AnnouncementForm buildings={buildings} today={today.toISOString().slice(0, 10)} />

        {items.map((a) => (
          <AnnouncementRow
            key={a.id}
            item={{
              id: a.id,
              title: a.title,
              body: a.body,
              pinned: a.pinned,
              buildingId: a.buildingId,
              buildingName: a.building?.name ?? null,
              expiresAt: a.expiresAt ? a.expiresAt.toISOString().slice(0, 10) : "",
              expiresLabel: a.expiresAt ? thDate(a.expiresAt) : null,
              expired: !!a.expiresAt && a.expiresAt < today,
              publishedLabel: a.publishedAt ? thDateTime(a.publishedAt) : null,
            }}
            buildings={buildings}
          />
        ))}

        {items.length === 0 && (
          <p className="bg-card text-muted-foreground rounded-xl border border-dashed p-6 text-center">
            ยังไม่มีประกาศ — เช่น แจ้งน้ำดับ วันเก็บขยะ หรือกำหนดชำระค่าเช่า
          </p>
        )}
      </div>
    </div>
  );
}

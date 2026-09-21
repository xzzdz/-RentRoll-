import Link from "next/link";
import { Building2, ChevronRight, Layers } from "lucide-react";
import { db } from "@/lib/db";
import { PageHead } from "@/components/PageHead";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AddBuildingForm } from "./AddBuildingForm";

export default async function BuildingsPage() {
  const property = await db.property.findFirstOrThrow({ select: { id: true } });
  const buildings = await db.building.findMany({
    where: { propertyId: property.id },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { rooms: true } },
      rooms: { where: { status: "OCCUPIED" }, select: { id: true } },
    },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHead title="ตึกและชั้น" sub="เพิ่มตึก สร้างห้องเป็นชุด และจัดผังแต่ละชั้น" />

      <div className="grid gap-3">
        <AddBuildingForm />

        {buildings.map((b) => (
          <Link key={b.id} href={`/buildings/${b.id}`} className="rounded-xl">
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="flex items-center gap-3">
                <span className="bg-accent text-accent-foreground grid size-11 shrink-0 place-items-center rounded-xl">
                  <Building2 className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <b className="font-display text-[15px]">{b.name}</b>
                  {b.code && <span className="text-subtle num text-[12px]"> · {b.code}</span>}
                  <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-[12.5px]">
                    <span className="inline-flex items-center gap-1">
                      <Layers className="size-3.5" aria-hidden /> {b.floors} ชั้น
                    </span>
                    <span>· {b._count.rooms} ห้อง</span>
                    {b._count.rooms > 0 && <span>· มีผู้เช่า {b.rooms.length}</span>}
                  </div>
                </div>
                {b._count.rooms === 0 && <Badge variant="warn">ยังไม่มีห้อง</Badge>}
                {b.floorPlan != null && <Badge variant="ok">มีผัง</Badge>}
                <ChevronRight className="text-subtle size-4 shrink-0" aria-hidden />
              </CardContent>
            </Card>
          </Link>
        ))}

        {buildings.length === 0 && (
          <p className="bg-card text-muted-foreground rounded-xl border border-dashed p-6 text-center">
            ยังไม่มีตึก — เพิ่มตึกแรกด้านบน แล้วค่อยสร้างห้องเป็นชุด
          </p>
        )}
      </div>
    </div>
  );
}

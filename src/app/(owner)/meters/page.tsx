import Link from "next/link";
import { db } from "@/lib/db";
import { currentPropertyId } from "@/lib/auth";
import { periodOf } from "@/lib/period";
import { thPeriod } from "@/lib/format";
import { getRates } from "@/lib/rates";
import { getMeterRows } from "@/lib/meters";
import { PageHead } from "@/components/PageHead";
import { BuildingTabs } from "@/components/BuildingTabs";
import { Button } from "@/components/ui/button";
import { MeterEntry } from "./MeterEntry";

export default async function MetersPage({ searchParams }: { searchParams: Promise<{ b?: string }> }) {
  const { b } = await searchParams;
  const property = await db.property.findUniqueOrThrow({ where: { id: await currentPropertyId() } });
  const buildings = await db.building.findMany({ where: { propertyId: property.id }, orderBy: { sortOrder: "asc" } });
  const building = buildings.find((x) => x.id === b) ?? buildings[0];
  const period = periodOf();

  if (!building) {
    return (
      <>
        <PageHead title="จดมิเตอร์" />
        <div className="bg-card grid justify-items-center gap-3 rounded-xl border border-dashed p-8 text-center">
          <p className="text-muted-foreground">ยังไม่มีตึกในระบบ</p>
          <Button asChild>
            <Link href="/buildings">เพิ่มตึกแรก</Link>
          </Button>
        </div>
      </>
    );
  }

  const [rows, rates] = await Promise.all([getMeterRows(building.id, period), getRates(property.id, period, building.id)]);

  return (
    <>
      <PageHead title={`จดมิเตอร์ · ${thPeriod(period)}`} sub="เลขครั้งก่อนดึงมาให้แล้ว กรอกเฉพาะเลขใหม่ · ระบบบันทึกให้เองทุกครั้งที่เปลี่ยนห้อง">
        <BuildingTabs buildings={buildings} current={building.id} basePath="/meters" />
      </PageHead>
      {/* key: เปลี่ยนตึกแล้วเริ่มนับห้องใหม่ */}
      <MeterEntry key={building.id} rows={rows} rates={{ water: rates.water, electric: rates.electric }} />
    </>
  );
}

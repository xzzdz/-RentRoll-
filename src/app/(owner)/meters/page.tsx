import { db } from "@/lib/db";
import { periodOf } from "@/lib/period";
import { thPeriod } from "@/lib/format";
import { getRates } from "@/lib/rates";
import { getMeterRows } from "@/lib/meters";
import { PageHead } from "@/components/PageHead";
import { BuildingTabs } from "@/components/BuildingTabs";
import { MeterTable } from "./MeterTable";

export default async function MetersPage({ searchParams }: { searchParams: Promise<{ b?: string }> }) {
  const { b } = await searchParams;
  const property = await db.property.findFirstOrThrow();
  const buildings = await db.building.findMany({ where: { propertyId: property.id }, orderBy: { sortOrder: "asc" } });
  const building = buildings.find((x) => x.id === b) ?? buildings[0];
  const period = periodOf();

  if (!building) return <p className="bg-card rounded-xl border p-6">ยังไม่มีตึก — เพิ่มตึกในหน้าตั้งค่า</p>;

  const [rows, rates] = await Promise.all([getMeterRows(building.id, period), getRates(property.id, period, building.id)]);

  return (
    <>
      <PageHead title={`จดมิเตอร์ · ${thPeriod(period)}`} sub="เลขครั้งก่อนดึงมาให้อัตโนมัติ กรอกเฉพาะเลขใหม่ · ยอดบิลคำนวณตามหน้าตั้งค่า">
        <BuildingTabs buildings={buildings} current={building.id} basePath="/meters" />
      </PageHead>
      {/* key: เปลี่ยนตึกแล้วรีเซ็ต state ของตาราง */}
      <MeterTable key={building.id} rows={rows} rates={{ water: rates.water, electric: rates.electric }} />
    </>
  );
}

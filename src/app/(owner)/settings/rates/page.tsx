import { db } from "@/lib/db";
import { getRates } from "@/lib/rates";
import { periodOf } from "@/lib/period";
import { thPeriod } from "@/lib/format";
import { PageHead } from "@/components/PageHead";
import { RatesForm } from "./RatesForm";

export default async function RatesSettingsPage() {
  const property = await db.property.findFirstOrThrow({ select: { id: true } });
  const period = periodOf();
  const rates = await getRates(property.id, period);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHead
        title="ค่าน้ำ-ค่าไฟ"
        sub={`อัตราที่แก้ตอนนี้มีผลกับรอบ ${thPeriod(period)} เป็นต้นไป · บิลเดือนก่อนยังใช้อัตราเดิม`}
      />
      <RatesForm water={rates.water} electric={rates.electric} />
    </div>
  );
}

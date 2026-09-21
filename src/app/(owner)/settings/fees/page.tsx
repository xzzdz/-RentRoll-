import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { PageHead } from "@/components/PageHead";
import { AddFeeForm } from "./AddFeeForm";
import { FeeRow } from "./FeeRow";

export default async function FeesSettingsPage() {
  const property = await db.property.findFirstOrThrow({ select: { id: true } });
  const fees = await db.feeItem.findMany({
    where: { propertyId: property.id },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { _count: { select: { contracts: true } } },
  });
  const monthly = fees.filter((f) => f.isActive && f.charge === "MONTHLY").reduce((s, f) => s + f.amount.toNumber(), 0);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHead
        title="ค่าบริการอื่น"
        sub={`รายการที่เก็บเพิ่มจากค่าเช่า · ติ๊ก "ใส่ให้ทุกสัญญาใหม่" แล้วระบบจะเลือกให้เองตอนทำสัญญา`}
      />

      <div className="grid gap-3">
        <AddFeeForm />

        {fees.length > 0 && (
          <div className="text-muted-foreground flex items-center justify-between px-1 text-[13px]">
            <span>{fees.length} รายการ</span>
            <span>
              รวมรายเดือนที่เปิดใช้ <b className="num text-foreground">{money(monthly, 0)}</b> บาท
            </span>
          </div>
        )}

        {fees.map((f) => (
          <FeeRow
            key={f.id}
            fee={{
              id: f.id,
              name: f.name,
              amount: f.amount.toNumber(),
              charge: f.charge,
              isDefault: f.isDefault,
              isActive: f.isActive,
              usedBy: f._count.contracts,
            }}
          />
        ))}

        {fees.length === 0 && (
          <p className="bg-card text-muted-foreground rounded-xl border border-dashed p-6 text-center">
            ยังไม่มีค่าบริการ — เพิ่มรายการแรกด้านบน เช่น ค่าส่วนกลาง หรือค่าอินเทอร์เน็ต
          </p>
        )}
      </div>
    </div>
  );
}

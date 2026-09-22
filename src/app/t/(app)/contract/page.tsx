import Link from "next/link";
import { ChevronLeft, Info } from "lucide-react";
import { db } from "@/lib/db";
import { currentTenant } from "@/lib/tenant-auth";
import { money, thDate } from "@/lib/format";
import { CONTRACT_STATUS, StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "สัญญาเช่าของฉัน" };

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[116px_1fr] gap-2 py-1.5 text-[13.5px]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

export default async function TenantContractPage() {
  const t = await currentTenant();

  const contract = await db.contract.findUniqueOrThrow({
    where: { id: t.contract.id },
    include: {
      fees: { include: { feeItem: true } },
      tenants: { include: { tenant: { select: { fullName: true, phone: true } } }, orderBy: { isPrimary: "desc" } },
    },
  });

  // ค่าบริการที่เก็บทุกเดือนเท่านั้น และราคาต่อสัญญาชนะราคากลางเสมอ (กติกาเดียวกับตอนออกบิล)
  const fees = contract.fees
    .filter((f) => f.feeItem.isActive && f.feeItem.charge === "MONTHLY")
    .map((f) => ({ id: f.feeItemId, name: f.feeItem.name, amount: (f.amount ?? f.feeItem.amount).toNumber() }));
  const monthly = contract.monthlyRent.toNumber() + fees.reduce((s, f) => s + f.amount, 0);

  return (
    <div className="grid gap-4">
      <Link href="/t" className="text-muted-foreground inline-flex items-center gap-1 text-sm hover:underline">
        <ChevronLeft className="size-4" /> หน้าแรก
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-0.5">
          <h1 className="font-display text-xl font-semibold">สัญญาเช่าของฉัน</h1>
          <span className="num text-subtle text-[12.5px]">{contract.contractNo}</span>
        </div>
        <StatusBadge map={CONTRACT_STATUS[contract.status]} />
      </div>

      <Card>
        <CardContent>
          <dl className="divide-y">
            <Line label="ห้อง">
              <span className="num font-semibold">{t.room.number}</span> · {t.building.name} · {t.room.roomType.name}
            </Line>
            <Line label="เริ่มสัญญา">{thDate(contract.startDate)}</Line>
            <Line label="สิ้นสุดสัญญา">{contract.endDate ? thDate(contract.endDate) : "ไม่ระบุ"}</Line>
            {contract.moveOutDate && <Line label="วันย้ายออก">{thDate(contract.moveOutDate)}</Line>}
            <Line label="ค่าเช่า/เดือน">
              <span className="num font-semibold">{money(contract.monthlyRent.toNumber())}</span> บาท
            </Line>
            <Line label="เงินประกัน">
              <span className="num">{money(contract.depositAmount.toNumber())}</span> บาท
              {contract.depositRefund != null && (
                <span className="text-subtle block text-[12px]">คืนแล้ว {money(contract.depositRefund.toNumber())} บาท</span>
              )}
            </Line>
          </dl>
        </CardContent>
      </Card>

      {fees.length > 0 && (
        <Card>
          <CardContent className="grid gap-2">
            <span className="eyebrow">ค่าบริการรายเดือน</span>
            {fees.map((f) => (
              <div key={f.id} className="flex justify-between text-[13.5px]">
                <span>{f.name}</span>
                <span className="num">{money(f.amount)}</span>
              </div>
            ))}
            <div className="font-display flex justify-between border-t pt-2 text-[14.5px] font-semibold">
              <span>รวมต่อเดือน (ไม่รวมน้ำ-ไฟ)</span>
              <span className="num">{money(monthly)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="grid gap-2">
          <span className="eyebrow">ผู้เช่าในสัญญา</span>
          {contract.tenants.map((ct) => (
            <div key={ct.tenantId} className="flex items-center justify-between gap-2 text-[13.5px]">
              <span>
                {ct.tenant.fullName}
                {ct.isPrimary && <span className="text-subtle text-[11.5px]"> · ผู้เช่าหลัก</span>}
              </span>
              <span className="num text-muted-foreground text-[12.5px]">{ct.tenant.phone}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-subtle flex items-start gap-2 text-[12.5px]">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        หน้านี้แสดงสาระสำคัญของสัญญาตามที่บันทึกไว้ในระบบ · ตัวสัญญาฉบับเต็มเป็นเอกสารที่เซ็นไว้กับสำนักงาน ขอสำเนาได้ที่สำนักงานหอพัก
      </p>
    </div>
  );
}

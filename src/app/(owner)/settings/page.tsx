import type { Prisma } from "@prisma/client";
import { Save } from "lucide-react";
import { db } from "@/lib/db";
import { periodOf } from "@/lib/period";
import { getRates } from "@/lib/rates";
import { PageHead } from "@/components/PageHead";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveSettings } from "./actions";

type RateRow = Prisma.UtilityRateGetPayload<{ include: { tiers: true } }> | null;

const v = (d: Prisma.Decimal | null | undefined) => (d == null ? "" : d.toString());

function CheckField({ id, name, label, defaultChecked }: { id: string; name: string; label: string; defaultChecked: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} name={name} defaultChecked={defaultChecked} />
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
    </div>
  );
}

function RateFields({ prefix, title, row }: { prefix: string; title: string; row: RateRow }) {
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-2 font-display text-base font-semibold">{title}</legend>
      <Field id={`${prefix}_mode`} label="วิธีคิด">
        <Select name={`${prefix}_mode`} defaultValue={row?.mode === "FLAT" ? "FLAT" : "PER_UNIT"}>
          <SelectTrigger id={`${prefix}_mode`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PER_UNIT">ตามหน่วยมิเตอร์</SelectItem>
            <SelectItem value="FLAT">เหมาจ่ายรายเดือน</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-2.5">
        <Field id={`${prefix}_unitPrice`} label="ราคาต่อหน่วย" unit="บาท">
          <Input id={`${prefix}_unitPrice`} name={`${prefix}_unitPrice`} type="number" step="0.01" min="0" defaultValue={v(row?.unitPrice)} className="pr-12" />
        </Field>
        <Field id={`${prefix}_minimumCharge`} label="ขั้นต่ำ (บาท)" unit="บาท">
          <Input id={`${prefix}_minimumCharge`} name={`${prefix}_minimumCharge`} type="number" step="0.01" min="0" defaultValue={v(row?.minimumCharge)} className="pr-12" />
        </Field>
        <Field id={`${prefix}_minimumUnits`} label="ขั้นต่ำ (หน่วย)" unit="หน่วย">
          <Input id={`${prefix}_minimumUnits`} name={`${prefix}_minimumUnits`} type="number" step="0.01" min="0" defaultValue={v(row?.minimumUnits)} className="pr-14" />
        </Field>
        <Field id={`${prefix}_flatAmount`} label="ราคาเหมา" unit="บาท" hint="ใช้เมื่อเลือกเหมาจ่าย">
          <Input id={`${prefix}_flatAmount`} name={`${prefix}_flatAmount`} type="number" step="0.01" min="0" defaultValue={v(row?.flatAmount)} className="pr-12" />
        </Field>
      </div>
    </fieldset>
  );
}

export default async function SettingsPage() {
  const property = await db.property.findFirstOrThrow({
    include: { billingSetting: true, feeItems: { orderBy: { name: "asc" } } },
  });
  const rates = await getRates(property.id, periodOf());
  const st = property.billingSetting;

  return (
    <form action={saveSettings}>
      <PageHead title="ตั้งค่า" sub="มีผลกับบิลรอบถัดไป · เปลี่ยนอัตราเดือนใหม่ ระบบเก็บอัตราเดิมไว้ใช้กับบิลย้อนหลัง">
        <SubmitButton pendingText="กำลังบันทึก…">
          <Save /> บันทึกการตั้งค่า
        </SubmitButton>
      </PageHead>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="grid gap-6">
            <RateFields prefix="water" title="ค่าน้ำ" row={rates.rows.water} />
            <RateFields prefix="electric" title="ค่าไฟ" row={rates.rows.electric} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>รอบบิล</CardTitle>
            <CardDescription>ใส่เป็นวันที่ของเดือน (1–28)</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid grid-cols-3 gap-2.5">
              <Field id="billingDay" label="สร้างบิลร่าง">
                <Input id="billingDay" name="billingDay" type="number" min="1" max="28" defaultValue={st?.billingDay ?? 25} />
              </Field>
              <Field id="issueDay" label="ส่งบิล">
                <Input id="issueDay" name="issueDay" type="number" min="1" max="28" defaultValue={st?.issueDay ?? 1} />
              </Field>
              <Field id="dueDay" label="ครบกำหนด">
                <Input id="dueDay" name="dueDay" type="number" min="1" max="28" defaultValue={st?.dueDay ?? 5} />
              </Field>
            </div>
            <CheckField id="autoIssue" name="autoIssue" label="ส่งบิลร่างอัตโนมัติในวันส่งบิล" defaultChecked={st?.autoIssue ?? false} />
            <CheckField id="prorateFirstMonth" name="prorateFirstMonth" label="คิดค่าเช่าตามจำนวนวันเมื่อเข้า/ออกกลางเดือน" defaultChecked={st?.prorateFirstMonth ?? true} />

            <h3 className="mt-3 font-display text-base font-semibold">ค่าปรับชำระล่าช้า</h3>
            <Field id="lateFeeMode" label="รูปแบบ">
              <Select name="lateFeeMode" defaultValue={st?.lateFeeMode ?? "NONE"}>
                <SelectTrigger id="lateFeeMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">ไม่มีค่าปรับ</SelectItem>
                  <SelectItem value="FIXED">ปรับครั้งเดียว</SelectItem>
                  <SelectItem value="PER_DAY">ปรับรายวัน</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-3 gap-2.5">
              <Field id="lateFeeAmount" label="จำนวน (/วัน)" unit="฿">
                <Input id="lateFeeAmount" name="lateFeeAmount" type="number" min="0" step="0.01" defaultValue={v(st?.lateFeeAmount)} className="pr-7" />
              </Field>
              <Field id="lateFeeMax" label="สูงสุด" unit="฿">
                <Input id="lateFeeMax" name="lateFeeMax" type="number" min="0" step="0.01" defaultValue={v(st?.lateFeeMax)} className="pr-7" />
              </Field>
              <Field id="graceDays" label="ผ่อนผัน" unit="วัน">
                <Input id="graceDays" name="graceDays" type="number" min="0" defaultValue={st?.graceDays ?? 0} className="pr-10" />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ค่าบริการอื่น</CardTitle>
            <CardDescription>&quot;ค่าเริ่มต้น&quot; = ติ๊กให้อัตโนมัติตอนทำสัญญาใหม่</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {property.feeItems.map((f) => (
              <div key={f.id} className="grid grid-cols-[1fr_104px] items-center gap-2 border-t pt-3">
                <Input aria-label="ชื่อรายการ" id={`fee_${f.id}_name`} name={`fee_${f.id}_name`} defaultValue={f.name} />
                <Input
                  aria-label={`ราคา ${f.name}`}
                  id={`fee_${f.id}_amount`}
                  name={`fee_${f.id}_amount`}
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={f.amount.toString()}
                  className="num text-right"
                />
                <div className="text-muted-foreground col-span-2 flex flex-wrap items-center gap-4 text-[12.5px]">
                  <CheckField id={`fee_${f.id}_active`} name={`fee_${f.id}_active`} label="ใช้งาน" defaultChecked={f.isActive} />
                  <CheckField id={`fee_${f.id}_default`} name={`fee_${f.id}_default`} label="ค่าเริ่มต้น" defaultChecked={f.isDefault} />
                  <span className="ml-auto">{f.charge === "MONTHLY" ? "รายเดือน" : "ครั้งเดียว"}</span>
                </div>
              </div>
            ))}
            <div className="grid grid-cols-[1fr_104px] items-center gap-2 border-t pt-3">
              <Input aria-label="ชื่อรายการใหม่" id="newFeeName" name="newFeeName" placeholder="+ เพิ่มรายการ เช่น ค่าที่จอดรถ" />
              <Input aria-label="ราคารายการใหม่" id="newFeeAmount" name="newFeeAmount" type="number" min="0" step="0.01" placeholder="บาท" className="num text-right" />
              <div className="col-span-2">
                <CheckField id="newFeeDefault" name="newFeeDefault" label="ค่าเริ่มต้น" defaultChecked={false} />
              </div>
            </div>

            <h3 className="mt-3 font-display text-base font-semibold">ช่องทางรับเงิน</h3>
            <Field id="promptPayId" label="PromptPay (เบอร์โทร/เลขประจำตัว)">
              <Input id="promptPayId" name="promptPayId" defaultValue={st?.promptPayId ?? ""} />
            </Field>
            <div className="grid grid-cols-2 gap-2.5">
              <Field id="bankName" label="ธนาคาร">
                <Input id="bankName" name="bankName" defaultValue={st?.bankName ?? ""} />
              </Field>
              <Field id="bankAccountNo" label="เลขบัญชี">
                <Input id="bankAccountNo" name="bankAccountNo" defaultValue={st?.bankAccountNo ?? ""} />
              </Field>
            </div>
            <Field id="bankAccountName" label="ชื่อบัญชี">
              <Input id="bankAccountName" name="bankAccountName" defaultValue={st?.bankAccountName ?? ""} />
            </Field>
            <Field id="receiptFooter" label="ข้อความท้ายใบเสร็จ">
              <Input id="receiptFooter" name="receiptFooter" defaultValue={st?.receiptFooter ?? ""} />
            </Field>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

import { Save } from "lucide-react";
import { db } from "@/lib/db";
import { currentPropertyId } from "@/lib/auth";
import { PageHead } from "@/components/PageHead";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { savePropertyInfo } from "./actions";

export default async function PropertySettingsPage() {
  const property = await db.property.findUniqueOrThrow({ where: { id: await currentPropertyId() }, include: { billingSetting: true } });

  return (
    <form action={savePropertyInfo} className="mx-auto max-w-2xl">
      <PageHead title="ข้อมูลหอพัก" sub="ใช้เป็นหัวใบแจ้งหนี้และใบเสร็จ" />
      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลทั่วไป</CardTitle>
          <CardDescription>ชื่อและที่อยู่นี้จะพิมพ์อยู่บนเอกสารที่ส่งให้ผู้เช่า</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Field id="name" label="ชื่อหอพัก">
            <Input id="name" name="name" defaultValue={property.name} required maxLength={120} />
          </Field>
          <Field id="address" label="ที่อยู่">
            <Textarea id="address" name="address" rows={2} defaultValue={property.address} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="phone" label="เบอร์ติดต่อ">
              <Input id="phone" name="phone" inputMode="tel" defaultValue={property.phone ?? ""} className="num" />
            </Field>
            <Field id="taxId" label="เลขประจำตัวผู้เสียภาษี" hint="ใส่เมื่อต้องออกเอกสารแบบมีภาษี">
              <Input id="taxId" name="taxId" inputMode="numeric" defaultValue={property.taxId ?? ""} className="num" />
            </Field>
          </div>
          <Field id="receiptFooter" label="ข้อความท้ายใบเสร็จ" hint="เช่น ขอบคุณที่ชำระตรงเวลา">
            <Input id="receiptFooter" name="receiptFooter" defaultValue={property.billingSetting?.receiptFooter ?? ""} />
          </Field>
          <div className="flex justify-end border-t pt-3">
            <SubmitButton pendingText="กำลังบันทึก…">
              <Save /> บันทึก
            </SubmitButton>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

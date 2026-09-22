import { Banknote, QrCode, Save } from "lucide-react";
import { db } from "@/lib/db";
import { currentPropertyId } from "@/lib/auth";
import { PageHead } from "@/components/PageHead";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { savePayment } from "../actions";

export default async function PaymentSettingsPage() {
  const property = await db.property.findUniqueOrThrow({ where: { id: await currentPropertyId() }, include: { billingSetting: true } });
  const st = property.billingSetting;

  return (
    <form action={savePayment} className="mx-auto grid max-w-2xl gap-4">
      <PageHead title="ช่องทางรับเงิน" sub="ข้อมูลนี้จะแสดงบนใบแจ้งหนี้เพื่อให้ผู้เช่าโอนเงินได้ถูกบัญชี" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="text-primary size-4.5" aria-hidden /> PromptPay
          </CardTitle>
          <CardDescription>ใส่เบอร์โทรหรือเลขประจำตัวประชาชนที่ผูกพร้อมเพย์ไว้</CardDescription>
        </CardHeader>
        <CardContent>
          <Field id="promptPayId" label="เบอร์โทร / เลขประจำตัวประชาชน">
            <Input id="promptPayId" name="promptPayId" inputMode="numeric" defaultValue={st?.promptPayId ?? ""} className="num" placeholder="0812345678" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="text-primary size-4.5" aria-hidden /> บัญชีธนาคาร
          </CardTitle>
          <CardDescription>เว้นว่างได้ถ้ารับเฉพาะพร้อมเพย์หรือเงินสด</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="bankName" label="ธนาคาร">
              <Input id="bankName" name="bankName" defaultValue={st?.bankName ?? ""} placeholder="เช่น กสิกรไทย" />
            </Field>
            <Field id="bankAccountNo" label="เลขบัญชี">
              <Input id="bankAccountNo" name="bankAccountNo" inputMode="numeric" defaultValue={st?.bankAccountNo ?? ""} className="num" />
            </Field>
          </div>
          <Field id="bankAccountName" label="ชื่อบัญชี">
            <Input id="bankAccountName" name="bankAccountName" defaultValue={st?.bankAccountName ?? ""} />
          </Field>
        </CardContent>
      </Card>

      <div className="bg-card/80 sticky bottom-20 flex justify-end rounded-xl border p-3 backdrop-blur lg:bottom-4">
        <SubmitButton pendingText="กำลังบันทึก…">
          <Save /> บันทึก
        </SubmitButton>
      </div>
    </form>
  );
}

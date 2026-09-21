"use client";

import { useState } from "react";
import { CalendarDays, Save, TimerReset } from "lucide-react";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveBillingCycle } from "../actions";

type LateMode = "NONE" | "FIXED" | "PER_DAY";

export type BillingSettingView = {
  billingDay: number;
  issueDay: number;
  dueDay: number;
  autoIssue: boolean;
  prorateFirstMonth: boolean;
  lateFeeMode: LateMode;
  lateFeeAmount: number | null;
  lateFeeMax: number | null;
  graceDays: number;
};

function Toggle({ id, name, label, hint, defaultChecked }: { id: string; name: string; label: string; hint: string; defaultChecked: boolean }) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-start gap-2.5 rounded-lg border p-3">
      <Checkbox id={id} name={name} defaultChecked={defaultChecked} />
      <Label htmlFor={id} className="grid gap-0.5 font-normal">
        <span className="font-semibold">{label}</span>
        <span className="text-subtle text-[12px] leading-snug">{hint}</span>
      </Label>
    </div>
  );
}

export function BillingForm({ setting }: { setting: BillingSettingView }) {
  const [mode, setMode] = useState<LateMode>(setting.lateFeeMode);
  const noFee = mode === "NONE";

  return (
    <form action={saveBillingCycle} className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="text-primary size-4.5" aria-hidden /> ปฏิทินรอบบิล
          </CardTitle>
          <CardDescription>ใส่เป็นวันที่ของเดือน (1–28 เพื่อให้ใช้ได้ทุกเดือนรวมกุมภาพันธ์)</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid grid-cols-3 gap-2.5">
            <Field id="billingDay" label="สร้างบิลร่าง" hint="ปิดรอบมิเตอร์">
              <Input id="billingDay" name="billingDay" type="number" min="1" max="28" inputMode="numeric" defaultValue={setting.billingDay} className="num" />
            </Field>
            <Field id="issueDay" label="ส่งบิล" hint="เดือนถัดไป">
              <Input id="issueDay" name="issueDay" type="number" min="1" max="28" inputMode="numeric" defaultValue={setting.issueDay} className="num" />
            </Field>
            <Field id="dueDay" label="ครบกำหนด" hint="เดือนถัดไป">
              <Input id="dueDay" name="dueDay" type="number" min="1" max="28" inputMode="numeric" defaultValue={setting.dueDay} className="num" />
            </Field>
          </div>
          <Toggle
            id="autoIssue"
            name="autoIssue"
            label="ส่งบิลอัตโนมัติ"
            hint="ถึงวันส่งบิลแล้วระบบส่งให้เอง ไม่ต้องกดเอง"
            defaultChecked={setting.autoIssue}
          />
          <Toggle
            id="prorateFirstMonth"
            name="prorateFirstMonth"
            label="คิดค่าเช่าตามจำนวนวัน"
            hint="ผู้เช่าเข้าหรือออกกลางเดือน คิดเฉพาะวันที่อยู่จริง"
            defaultChecked={setting.prorateFirstMonth}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TimerReset className="text-primary size-4.5" aria-hidden /> ค่าปรับชำระล่าช้า
          </CardTitle>
          <CardDescription>{noFee ? "ตอนนี้ไม่คิดค่าปรับ" : "เริ่มคิดหลังพ้นวันผ่อนผันนับจากวันครบกำหนด"}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Field id="lateFeeMode" label="รูปแบบ">
            <Select name="lateFeeMode" value={mode} onValueChange={(v) => setMode(v as LateMode)}>
              <SelectTrigger id="lateFeeMode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">ไม่คิดค่าปรับ</SelectItem>
                <SelectItem value="FIXED">ปรับครั้งเดียว</SelectItem>
                <SelectItem value="PER_DAY">ปรับรายวัน</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {!noFee && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Field id="lateFeeAmount" label={mode === "PER_DAY" ? "ค่าปรับต่อวัน" : "ค่าปรับ"} unit="฿">
                <Input
                  id="lateFeeAmount"
                  name="lateFeeAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  defaultValue={setting.lateFeeAmount ?? ""}
                  className="num pr-7"
                />
              </Field>
              {mode === "PER_DAY" && (
                <Field id="lateFeeMax" label="ปรับได้ไม่เกิน" unit="฿" hint="เว้นว่าง = ไม่จำกัด">
                  <Input
                    id="lateFeeMax"
                    name="lateFeeMax"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    defaultValue={setting.lateFeeMax ?? ""}
                    className="num pr-7"
                  />
                </Field>
              )}
              <Field id="graceDays" label="ผ่อนผัน" unit="วัน" hint="เกินกี่วันจึงเริ่มปรับ">
                <Input id="graceDays" name="graceDays" type="number" min="0" inputMode="numeric" defaultValue={setting.graceDays} className="num pr-10" />
              </Field>
            </div>
          )}
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

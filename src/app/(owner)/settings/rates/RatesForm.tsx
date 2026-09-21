"use client";

import { useState } from "react";
import { Droplets, Save, Zap } from "lucide-react";
import { utilityCharge, type RateConfig } from "@/lib/billing";
import { money } from "@/lib/format";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveRates } from "../actions";

type Mode = "PER_UNIT" | "FLAT";

const n = (v: number | null | undefined) => (v == null ? "" : String(v));

/** ตัวอย่างค่าใช้จ่ายจากค่าที่กรอกอยู่ — ช่วยให้เห็นผลก่อนบันทึก */
function Preview({ mode, unitPrice, minimumCharge, minimumUnits, flatAmount, units, unitLabel }: {
  mode: Mode;
  unitPrice: string;
  minimumCharge: string;
  minimumUnits: string;
  flatAmount: string;
  units: number;
  unitLabel: string;
}) {
  const cfg: RateConfig = {
    mode,
    unitPrice: unitPrice === "" ? null : Number(unitPrice),
    minimumUnits: minimumUnits === "" ? null : Number(minimumUnits),
    minimumCharge: minimumCharge === "" ? null : Number(minimumCharge),
    flatAmount: flatAmount === "" ? null : Number(flatAmount),
    tiers: [],
  };
  const r = utilityCharge(cfg, units);
  return (
    <p className="bg-muted text-muted-foreground rounded-lg px-3 py-2 text-[12.5px]">
      ตัวอย่าง: {mode === "FLAT" ? "ห้องหนึ่ง" : `ใช้ ${units} ${unitLabel}`} ={" "}
      <b className="num text-foreground">{money(r.amount)}</b> บาท
      {r.note ? ` · ${r.note}` : ""}
    </p>
  );
}

function RateBlock({ prefix, title, icon: Icon, row, sampleUnits, unitLabel }: {
  prefix: string;
  title: string;
  icon: typeof Droplets;
  row: RateConfig | null;
  sampleUnits: number;
  unitLabel: string;
}) {
  const [mode, setMode] = useState<Mode>(row?.mode === "FLAT" ? "FLAT" : "PER_UNIT");
  const [unitPrice, setUnitPrice] = useState(n(row?.unitPrice));
  const [minimumCharge, setMinimumCharge] = useState(n(row?.minimumCharge));
  const [minimumUnits, setMinimumUnits] = useState(n(row?.minimumUnits));
  const [flatAmount, setFlatAmount] = useState(n(row?.flatAmount));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4.5 text-primary" aria-hidden /> {title}
        </CardTitle>
        <CardDescription>
          {mode === "FLAT" ? "คิดเท่ากันทุกเดือน ไม่ต้องจดมิเตอร์" : "คิดตามหน่วยที่ใช้จริง ต้องจดมิเตอร์ทุกรอบ"}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Field id={`${prefix}_mode`} label="วิธีคิด">
          <Select name={`${prefix}_mode`} value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <SelectTrigger id={`${prefix}_mode`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PER_UNIT">ตามหน่วยมิเตอร์</SelectItem>
              <SelectItem value="FLAT">เหมาจ่ายรายเดือน</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {mode === "PER_UNIT" ? (
          <>
            <Field id={`${prefix}_unitPrice`} label="ราคาต่อหน่วย" unit="บาท">
              <Input
                id={`${prefix}_unitPrice`}
                name={`${prefix}_unitPrice`}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="num pr-12"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id={`${prefix}_minimumCharge`} label="ค่าขั้นต่ำ" unit="บาท" hint="ใช้น้อยแค่ไหนก็เก็บเท่านี้">
                <Input
                  id={`${prefix}_minimumCharge`}
                  name={`${prefix}_minimumCharge`}
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={minimumCharge}
                  onChange={(e) => setMinimumCharge(e.target.value)}
                  className="num pr-12"
                  placeholder="ไม่มี"
                />
              </Field>
              <Field id={`${prefix}_minimumUnits`} label="หน่วยขั้นต่ำ" unit={unitLabel} hint="คิดอย่างน้อยกี่หน่วย">
                <Input
                  id={`${prefix}_minimumUnits`}
                  name={`${prefix}_minimumUnits`}
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={minimumUnits}
                  onChange={(e) => setMinimumUnits(e.target.value)}
                  className="num pr-14"
                  placeholder="ไม่มี"
                />
              </Field>
            </div>
          </>
        ) : (
          <Field id={`${prefix}_flatAmount`} label="ราคาเหมาต่อเดือน" unit="บาท">
            <Input
              id={`${prefix}_flatAmount`}
              name={`${prefix}_flatAmount`}
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={flatAmount}
              onChange={(e) => setFlatAmount(e.target.value)}
              className="num pr-12"
            />
          </Field>
        )}

        <Preview
          mode={mode}
          unitPrice={unitPrice}
          minimumCharge={minimumCharge}
          minimumUnits={minimumUnits}
          flatAmount={flatAmount}
          units={sampleUnits}
          unitLabel={unitLabel}
        />
      </CardContent>
    </Card>
  );
}

export function RatesForm({ water, electric }: { water: RateConfig | null; electric: RateConfig | null }) {
  return (
    <form action={saveRates} className="grid gap-4">
      <RateBlock prefix="water" title="ค่าน้ำ" icon={Droplets} row={water} sampleUnits={8} unitLabel="หน่วย" />
      <RateBlock prefix="electric" title="ค่าไฟ" icon={Zap} row={electric} sampleUnits={150} unitLabel="หน่วย" />
      <div className="bg-card/80 sticky bottom-20 flex justify-end rounded-xl border p-3 backdrop-blur lg:bottom-4">
        <SubmitButton pendingText="กำลังบันทึก…">
          <Save /> บันทึกอัตรา
        </SubmitButton>
      </div>
    </form>
  );
}

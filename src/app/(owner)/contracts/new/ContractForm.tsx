"use client";

import { useActionState, useState } from "react";
import { FileSignature, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/Field";
import { money } from "@/lib/format";
import { createContract, type ContractFormState } from "../actions";

export type RoomOption = {
  id: string;
  number: string;
  building: string;
  typeName: string;
  rent: number;
  deposit: number;
  status: string;
  lastWater: number | null;
  lastElectric: number | null;
  hasWater: boolean;
  hasElectric: boolean;
};
export type FeeOption = { id: string; name: string; amount: number; isDefault: boolean; charge: string };

const addYear = (s: string) => {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

export function ContractForm({ rooms, fees, defaultRoomId, today }: { rooms: RoomOption[]; fees: FeeOption[]; defaultRoomId?: string; today: string }) {
  const [state, action, pending] = useActionState<ContractFormState, FormData>(createContract, undefined);
  const [roomId, setRoomId] = useState(defaultRoomId && rooms.some((r) => r.id === defaultRoomId) ? defaultRoomId : "");
  const room = rooms.find((r) => r.id === roomId);
  const [rent, setRent] = useState(room ? String(room.rent) : "");
  const [deposit, setDeposit] = useState(room ? String(room.deposit) : "");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(addYear(today));
  const err = (k: string) => state?.fieldErrors?.[k];

  const buildings = [...new Set(rooms.map((r) => r.building))];

  function pickRoom(id: string) {
    setRoomId(id);
    const r = rooms.find((x) => x.id === id);
    if (r) {
      setRent(String(r.rent));
      setDeposit(String(r.deposit));
    }
  }

  return (
    <form action={action} className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="grid content-start gap-4">
        <Card>
          <CardHeader>
            <CardTitle>ห้องและสัญญา</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field id="roomId" label="ห้อง" className="sm:col-span-2">
              <Select name="roomId" value={roomId} onValueChange={pickRoom}>
                <SelectTrigger id="roomId" aria-invalid={!!err("roomId")}>
                  <SelectValue placeholder="เลือกห้องว่าง" />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((b) => (
                    <SelectGroup key={b}>
                      <SelectLabel>{b}</SelectLabel>
                      {rooms
                        .filter((r) => r.building === b)
                        .map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.number} · {r.typeName} · {money(r.rent, 0)} บาท{r.status === "RESERVED" ? " · จองแล้ว" : ""}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="startDate" label="วันเริ่มสัญญา / วันเข้าอยู่">
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  if (e.target.value) setEnd(addYear(e.target.value));
                }}
                aria-invalid={!!err("startDate")}
                required
              />
            </Field>
            <Field id="endDate" label="วันสิ้นสุดสัญญา" hint="เว้นว่างได้ถ้าไม่มีกำหนด">
              <Input id="endDate" name="endDate" type="date" value={end} onChange={(e) => setEnd(e.target.value)} aria-invalid={!!err("endDate")} />
            </Field>
            <Field id="monthlyRent" label="ค่าเช่า/เดือน" unit="บาท">
              <Input id="monthlyRent" name="monthlyRent" type="number" min="0" step="0.01" value={rent} onChange={(e) => setRent(e.target.value)} className="num pr-12" aria-invalid={!!err("monthlyRent")} required />
            </Field>
            <Field id="depositAmount" label="เงินประกัน" unit="บาท">
              <Input id="depositAmount" name="depositAmount" type="number" min="0" step="0.01" value={deposit} onChange={(e) => setDeposit(e.target.value)} className="num pr-12" aria-invalid={!!err("depositAmount")} required />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ผู้เช่า</CardTitle>
            <CardDescription>เลขบัตรประชาชนถูกเข้ารหัสก่อนบันทึก</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field id="fullName" label="ชื่อ-นามสกุล">
              <Input id="fullName" name="fullName" aria-invalid={!!err("fullName")} required />
            </Field>
            <Field id="phone" label="เบอร์โทร">
              <Input id="phone" name="phone" inputMode="tel" placeholder="08xxxxxxxx" aria-invalid={!!err("phone")} required />
            </Field>
            <Field id="idCardNo" label="เลขบัตรประชาชน" hint={err("idCardNo")}>
              <Input id="idCardNo" name="idCardNo" inputMode="numeric" maxLength={17} aria-invalid={!!err("idCardNo")} />
            </Field>
            <Field id="emergencyName" label="ผู้ติดต่อฉุกเฉิน">
              <Input id="emergencyName" name="emergencyName" />
            </Field>
            <Field id="address" label="ที่อยู่ตามบัตร" className="sm:col-span-2">
              <Textarea id="address" name="address" rows={2} />
            </Field>
            <Field id="emergencyPhone" label="เบอร์ผู้ติดต่อฉุกเฉิน">
              <Input id="emergencyPhone" name="emergencyPhone" inputMode="tel" />
            </Field>
            <Field id="note" label="หมายเหตุ">
              <Input id="note" name="note" />
            </Field>
          </CardContent>
        </Card>
      </div>

      <div className="grid content-start gap-4">
        <Card>
          <CardHeader>
            <CardTitle>จดมิเตอร์ตั้งต้น</CardTitle>
            <CardDescription>ใช้เป็นเลขครั้งก่อนของบิลเดือนแรก</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Field id="waterInitial" label="มิเตอร์น้ำ" hint={room?.lastWater != null ? `เลขล่าสุดในระบบ ${money(room.lastWater, 0)}` : undefined}>
              <Input id="waterInitial" name="waterInitial" type="number" min="0" step="any" className="num" disabled={room ? !room.hasWater : false} aria-invalid={!!err("waterInitial")} />
            </Field>
            <Field id="electricInitial" label="มิเตอร์ไฟ" hint={room?.lastElectric != null ? `เลขล่าสุดในระบบ ${money(room.lastElectric, 0)}` : undefined}>
              <Input id="electricInitial" name="electricInitial" type="number" min="0" step="any" className="num" disabled={room ? !room.hasElectric : false} aria-invalid={!!err("electricInitial")} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ค่าบริการรายเดือน</CardTitle>
            <CardDescription>แก้ราคาเฉพาะสัญญานี้ได้</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2.5">
            {fees.length === 0 && <p className="text-muted-foreground text-sm">ยังไม่มีรายการ — เพิ่มได้ในหน้าตั้งค่า</p>}
            {fees.map((fee) => (
              <div key={fee.id} className="grid grid-cols-[auto_1fr_96px] items-center gap-2">
                <Checkbox id={`fee_${fee.id}`} name={`fee_${fee.id}`} defaultChecked={fee.isDefault} />
                <Label htmlFor={`fee_${fee.id}`} className="font-normal">
                  {fee.name}
                  {fee.charge === "ONE_TIME" && <span className="text-subtle text-xs">(ครั้งเดียว)</span>}
                </Label>
                <Input aria-label={`ราคา ${fee.name}`} name={`fee_${fee.id}_amount`} type="number" min="0" step="0.01" defaultValue={fee.amount} className="num h-8 text-right" />
              </div>
            ))}
          </CardContent>
        </Card>

        {state?.error && (
          <div role="alert" className="bg-bad-soft text-destructive rounded-md px-3 py-2 text-[13px]">
            <b>{state.error}</b>
            {state.fieldErrors && (
              <ul className="mt-1 list-disc pl-5">
                {Object.values(state.fieldErrors).map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <FileSignature />}
          {pending ? "กำลังบันทึก…" : "บันทึกสัญญา"}
        </Button>
      </div>
    </form>
  );
}

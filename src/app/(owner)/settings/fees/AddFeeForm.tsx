"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addFee } from "../actions";

const SUGGESTIONS = ["ค่าส่วนกลาง", "ค่าอินเทอร์เน็ต", "ค่าที่จอดรถ", "ค่าขยะ", "ค่าทำความสะอาด", "ค่ากุญแจ"];

export function AddFeeForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  if (!open) {
    return (
      <Button variant="outline" className="h-12 w-full border-dashed" onClick={() => setOpen(true)}>
        <Plus /> เพิ่มค่าบริการ
      </Button>
    );
  }

  return (
    <Card className="border-primary/40">
      <CardContent>
        <form action={addFee} className="grid gap-3">
          <Field id="newName" label="ชื่อรายการ">
            <Input id="newName" name="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} placeholder="เช่น ค่าส่วนกลาง" autoFocus />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setName(s)}
                className="border-border hover:bg-muted rounded-full border px-2.5 py-1 text-[12px]"
              >
                {s}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="newAmount" label="ราคา" unit="บาท">
              <Input id="newAmount" name="amount" type="number" min="0" step="0.01" inputMode="decimal" required className="num pr-12" />
            </Field>
            <Field id="newCharge" label="เก็บเมื่อไหร่">
              <Select name="charge" defaultValue="MONTHLY">
                <SelectTrigger id="newCharge">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">ทุกเดือน</SelectItem>
                  <SelectItem value="ONE_TIME">ครั้งเดียวตอนทำสัญญา</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="newDefault" name="isDefault" defaultChecked />
            <Label htmlFor="newDefault" className="font-normal">
              ใส่ให้ทุกสัญญาใหม่อัตโนมัติ
            </Label>
          </div>
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <SubmitButton pendingText="กำลังเพิ่ม…">
              <Plus /> เพิ่มรายการ
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

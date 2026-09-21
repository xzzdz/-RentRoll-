"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createRoomType } from "./actions";

export function AddRoomTypeForm() {
  const [open, setOpen] = useState(false);
  const [rent, setRent] = useState("");

  if (!open) {
    return (
      <Button variant="outline" className="h-12 w-full border-dashed" onClick={() => setOpen(true)}>
        <Plus /> เพิ่มประเภทห้อง
      </Button>
    );
  }

  return (
    <Card className="border-primary/40">
      <CardContent>
        <form action={createRoomType} className="grid gap-3">
          <Field id="rtName" label="ชื่อประเภท">
            <Input id="rtName" name="name" required maxLength={40} placeholder="เช่น ห้องแอร์" autoFocus />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="rtRent" label="ค่าเช่า/เดือน" unit="บาท">
              <Input
                id="rtRent"
                name="baseRent"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                required
                value={rent}
                onChange={(e) => setRent(e.target.value)}
                className="num pr-12"
              />
            </Field>
            <Field id="rtDeposit" label="เงินประกัน" unit="บาท" hint={rent ? `ปกติ 2 เท่า = ${(Number(rent) * 2).toLocaleString("th-TH")}` : "มักเป็น 2 เท่าของค่าเช่า"}>
              <Input id="rtDeposit" name="deposit" type="number" min="0" step="0.01" inputMode="decimal" required className="num pr-12" />
            </Field>
          </div>
          <Field id="rtDesc" label="รายละเอียด" hint="เว้นว่างได้">
            <Input id="rtDesc" name="description" maxLength={120} placeholder="เช่น 24 ตร.ม. มีระเบียง" />
          </Field>
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <SubmitButton pendingText="กำลังเพิ่ม…">
              <Plus /> เพิ่มประเภท
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

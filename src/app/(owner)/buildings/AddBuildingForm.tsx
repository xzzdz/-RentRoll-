"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createBuilding } from "./actions";

export function AddBuildingForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  // เดาตัวอักษรนำหน้าเลขห้องจากชื่อตึก เช่น "ตึก A" → "A"
  function onName(v: string) {
    setName(v);
    const guess = v.trim().split(/\s+/).pop() ?? "";
    if (guess.length <= 3) setCode(guess.toUpperCase());
  }

  if (!open) {
    return (
      <Button variant="outline" className="h-12 w-full border-dashed" onClick={() => setOpen(true)}>
        <Plus /> เพิ่มตึก
      </Button>
    );
  }

  return (
    <Card className="border-primary/40">
      <CardContent>
        <form action={createBuilding} className="grid gap-3">
          <Field id="bName" label="ชื่อตึก">
            <Input id="bName" name="name" value={name} onChange={(e) => onName(e.target.value)} required maxLength={40} placeholder="เช่น ตึก A" autoFocus />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="bCode" label="ตัวนำหน้าเลขห้อง" hint={`ใช้ตั้งเลขห้อง เช่น ${code || "A"}-101`}>
              <Input id="bCode" name="code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={4} className="num" />
            </Field>
            <Field id="bFloors" label="จำนวนชั้น">
              <Input id="bFloors" name="floors" type="number" min="1" max="60" inputMode="numeric" defaultValue={4} required className="num" />
            </Field>
          </div>
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <SubmitButton pendingText="กำลังสร้าง…">
              <Plus /> สร้างตึก
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

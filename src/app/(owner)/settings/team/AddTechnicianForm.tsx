"use client";

import { useActionState, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { Field } from "@/components/Field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { addTechnician, type TeamState } from "../actions";

export function AddTechnicianForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<TeamState, FormData>(addTechnician, undefined);

  if (!open) {
    return (
      <Button variant="outline" className="h-12 w-full border-dashed" onClick={() => setOpen(true)}>
        <UserPlus /> เพิ่มบัญชีช่าง
      </Button>
    );
  }

  return (
    <Card className="border-primary/40">
      <CardContent>
        <form action={action} className="grid gap-3">
          <Field id="techName" label="ชื่อช่าง">
            <Input id="techName" name="name" required maxLength={60} placeholder="เช่น ช่างสมชาย" autoFocus />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="techPhone" label="เบอร์โทร" hint="ใช้เป็นชื่อผู้ใช้ตอนล็อกอิน">
              <Input id="techPhone" name="phone" inputMode="tel" required maxLength={20} className="num" placeholder="0800000001" />
            </Field>
            <Field id="techPassword" label="รหัสผ่านเริ่มต้น" hint="อย่างน้อย 8 ตัวอักษร">
              <Input id="techPassword" name="password" type="text" required minLength={8} autoComplete="new-password" />
            </Field>
          </div>
          {state?.error && (
            <p role="alert" className="bg-bad-soft text-destructive rounded-md px-3 py-2 text-[13px]">
              {state.error}
            </p>
          )}
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <UserPlus />}
              เพิ่มช่าง
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

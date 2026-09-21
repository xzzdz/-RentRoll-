"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/Field";
import { completeAction, type FormState } from "../actions";

export function CompleteDialog({ requestId, hasTenant }: { requestId: string; hasTenant: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(completeAction, undefined);
  const [cost, setCost] = useState("");
  const billable = hasTenant && Number(cost) > 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full">
          <CheckCircle2 /> ปิดงาน
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ปิดงานซ่อม</DialogTitle>
          <DialogDescription>บันทึกค่าใช้จ่ายไว้ดูต้นทุนได้ · ติ๊กเรียกเก็บถ้าเป็นความเสียหายจากผู้เช่า</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-3">
          <input type="hidden" name="requestId" value={requestId} />
          <Field id="cost" label="ค่าใช้จ่าย" unit="บาท" hint="เว้นว่างได้ถ้าไม่มีค่าใช้จ่าย">
            <Input
              id="cost"
              name="cost"
              type="number"
              min="0"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="num pr-12"
              placeholder="0.00"
            />
          </Field>

          <div className="grid grid-cols-[auto_1fr] items-start gap-2">
            <Checkbox id="chargeTenant" name="chargeTenant" disabled={!billable} />
            <Label htmlFor="chargeTenant" className="font-normal leading-snug">
              เรียกเก็บจากผู้เช่า
              <span className="text-subtle block text-xs">
                {hasTenant ? "ค่าซ่อมจะถูกดึงเข้าบิลรอบถัดไปอัตโนมัติ" : "ห้องนี้ไม่มีผู้เช่าปัจจุบัน เรียกเก็บไม่ได้"}
              </span>
            </Label>
          </div>

          <Field id="completeComment" label="สรุปงานที่ทำ">
            <Textarea id="completeComment" name="comment" rows={2} placeholder="เช่น เปลี่ยนคอมเพรสเซอร์ ล้างแอร์" />
          </Field>

          {state?.error && (
            <p role="alert" className="bg-bad-soft text-destructive rounded-md px-3 py-2 text-[13px]">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              ปิดงาน
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

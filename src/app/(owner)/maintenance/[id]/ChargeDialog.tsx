"use client";

import { useActionState, useState } from "react";
import { Loader2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/Field";
import { chargeAction, type FormState } from "../actions";

export function ChargeDialog({
  requestId,
  cost,
  chargeTenant,
  hasTenant,
}: {
  requestId: string;
  cost: number | null;
  chargeTenant: boolean;
  hasTenant: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(chargeAction, undefined);
  const [value, setValue] = useState(cost == null ? "" : String(cost));
  const billable = hasTenant && Number(value) > 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Receipt /> แก้ค่าใช้จ่าย
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ค่าใช้จ่ายงานซ่อม</DialogTitle>
          <DialogDescription>แก้ได้จนกว่าค่าซ่อมจะถูกดึงเข้าบิลที่ส่งแล้ว</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-3">
          <input type="hidden" name="requestId" value={requestId} />
          <Field id="editCost" label="ค่าใช้จ่าย" unit="บาท" hint="เว้นว่าง = ไม่ระบุ">
            <Input
              id="editCost"
              name="cost"
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="num pr-12"
              placeholder="0.00"
            />
          </Field>
          <div className="grid grid-cols-[auto_1fr] items-start gap-2">
            <Checkbox id="editCharge" name="chargeTenant" defaultChecked={chargeTenant} disabled={!billable} />
            <Label htmlFor="editCharge" className="font-normal leading-snug">
              เรียกเก็บจากผู้เช่า
              <span className="text-subtle block text-xs">
                {hasTenant ? "ค่าซ่อมจะถูกดึงเข้าบิลรอบถัดไปอัตโนมัติ" : "งานนี้ไม่ได้ผูกผู้เช่า เรียกเก็บไม่ได้"}
              </span>
            </Label>
          </div>
          {state?.error && (
            <p role="alert" className="bg-bad-soft text-destructive rounded-md px-3 py-2 text-[13px]">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              บันทึก
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

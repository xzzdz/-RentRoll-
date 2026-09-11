"use client";

import { useActionState } from "react";
import { DoorOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/Field";
import { moveOut, type MoveOutState } from "./actions";

export function MoveOutDialog({
  contractId,
  roomNumber,
  today,
  deposit,
  hasWater,
  hasElectric,
}: {
  contractId: string;
  roomNumber: string;
  today: string;
  deposit: number;
  hasWater: boolean;
  hasElectric: boolean;
}) {
  const [state, action, pending] = useActionState<MoveOutState, FormData>(moveOut, undefined);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <DoorOpen /> ย้ายออก
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ย้ายออก · ห้อง {roomNumber}</DialogTitle>
          <DialogDescription>จดเลขมิเตอร์วันย้ายออก ระบบจะใช้ออกบิลสุดท้าย (คิดค่าเช่าตามจำนวนวันถ้าเปิดไว้ในตั้งค่า)</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-3">
          <input type="hidden" name="contractId" value={contractId} />
          <Field id="moveOutDate" label="วันย้ายออก">
            <Input id="moveOutDate" name="moveOutDate" type="date" defaultValue={today} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            {hasWater && (
              <Field id="waterFinal" label="มิเตอร์น้ำวันย้ายออก">
                <Input id="waterFinal" name="waterFinal" type="number" min="0" step="any" className="num" required />
              </Field>
            )}
            {hasElectric && (
              <Field id="electricFinal" label="มิเตอร์ไฟวันย้ายออก">
                <Input id="electricFinal" name="electricFinal" type="number" min="0" step="any" className="num" required />
              </Field>
            )}
          </div>
          <Field id="depositRefund" label="คืนเงินประกัน" unit="บาท" hint={`เงินประกันตามสัญญา ${deposit.toLocaleString("th-TH")} บาท · เว้นว่างถ้ายังไม่สรุป`}>
            <Input id="depositRefund" name="depositRefund" type="number" min="0" step="0.01" className="num pr-12" />
          </Field>
          <Field id="moveOutNote" label="หมายเหตุ">
            <Input id="moveOutNote" name="note" placeholder="เช่น หักค่าทำความสะอาด 500" />
          </Field>
          {state?.error && (
            <p role="alert" className="bg-bad-soft text-destructive rounded-md px-3 py-2 text-[13px]">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              ยืนยันย้ายออก
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

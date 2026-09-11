"use client";

import { useActionState } from "react";
import { Banknote, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/Field";
import { paymentAction, type PaymentState } from "../actions";

export function PaymentDialog({ invoiceId, outstanding, today }: { invoiceId: string; outstanding: number; today: string }) {
  const [state, action, pending] = useActionState<PaymentState, FormData>(paymentAction, undefined);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Banknote /> บันทึกรับเงิน
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>บันทึกรับเงิน</DialogTitle>
          <DialogDescription>ยอดค้าง {outstanding.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท · บันทึกแล้วระบบออกใบเสร็จให้อัตโนมัติ</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-3">
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <div className="grid grid-cols-2 gap-3">
            <Field id="amount" label="จำนวนเงิน" unit="บาท">
              <Input id="amount" name="amount" type="number" min="0.01" step="0.01" max={outstanding} defaultValue={outstanding} className="num pr-12" required />
            </Field>
            <Field id="paidAt" label="วันที่รับเงิน">
              <Input id="paidAt" name="paidAt" type="date" defaultValue={today} required />
            </Field>
          </div>
          <Field id="method" label="ช่องทาง">
            <Select name="method" defaultValue="TRANSFER">
              <SelectTrigger id="method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRANSFER">โอนเงิน</SelectItem>
                <SelectItem value="PROMPTPAY">PromptPay</SelectItem>
                <SelectItem value="CASH">เงินสด</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field id="payNote" label="หมายเหตุ">
            <Input id="payNote" name="note" placeholder="เช่น เลขอ้างอิงสลิป" />
          </Field>
          {state?.error && (
            <p role="alert" className="bg-bad-soft text-destructive rounded-md px-3 py-2 text-[13px]">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              บันทึก & ออกใบเสร็จ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

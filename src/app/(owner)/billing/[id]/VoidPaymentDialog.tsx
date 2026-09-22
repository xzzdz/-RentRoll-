"use client";

import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { voidPaymentAction } from "../actions";

/** ยกเลิกการรับชำระที่คีย์ผิด — ใช้ตอนกรอกยอดผิด ผิดใบ หรือเงินโอนเด้งกลับ */
export function VoidPaymentDialog({
  invoiceId,
  paymentId,
  amount,
  receiptNo,
}: {
  invoiceId: string;
  paymentId: string;
  amount: number;
  receiptNo: string | null;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive -ml-2 justify-self-start">
          <Undo2 className="size-3.5" /> ยกเลิกรายการนี้
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ยกเลิกการรับชำระ {amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท?</DialogTitle>
          <DialogDescription>
            ยอดนี้จะถูกปลดออกจากบิล และสถานะบิลจะถูกคำนวณใหม่
            {receiptNo ? ` · ใบเสร็จ ${receiptNo} จะถูกประทับว่า "ยกเลิกแล้ว" แต่ยังเก็บไว้ในระบบ เพราะเลขที่ใบเสร็จต้องรันต่อเนื่อง` : ""}
          </DialogDescription>
        </DialogHeader>
        <form action={voidPaymentAction} className="grid gap-3">
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <input type="hidden" name="paymentId" value={paymentId} />
          <Field id={`reason_${paymentId}`} label="เหตุผล" hint="บันทึกไว้บนใบเสร็จและในประวัติการแก้ไข">
            <Input id={`reason_${paymentId}`} name="reason" required placeholder="เช่น คีย์ยอดผิด · โอนเด้งกลับ · รับผิดใบ" />
          </Field>
          <DialogFooter>
            <SubmitButton variant="destructive" pendingText="กำลังยกเลิก…">
              ยืนยันยกเลิก
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { Check, CornerUpLeft, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { deleteParcel, handOverParcel, returnParcel } from "./actions";

export type ParcelRow = {
  id: string;
  recipient: string;
  roomNumber: string | null;
};

/**
 * จ่ายของ — ถามชื่อคนที่มารับไว้ด้วย เพราะบ่อยครั้งเป็นเพื่อนหรือคนในห้องเดียวกันมารับแทน
 * เว้นว่างได้ ระบบจะถือว่าเป็นชื่อหน้ากล่อง
 */
export function HandOverDialog({ parcel }: { parcel: ParcelRow }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Check /> จ่ายของ
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>จ่ายพัสดุของ {parcel.recipient}</DialogTitle>
          <DialogDescription>
            {parcel.roomNumber ? `ห้อง ${parcel.roomNumber} · ` : ""}บันทึกไว้ว่าใครมารับ เผื่อมีปัญหาทีหลังจะตามได้
          </DialogDescription>
        </DialogHeader>
        <form action={handOverParcel} className="grid gap-3">
          <input type="hidden" name="id" value={parcel.id} />
          <Field id={`collectedBy-${parcel.id}`} label="ชื่อคนที่มารับ" hint={`เว้นว่าง = ${parcel.recipient} มารับเอง`}>
            <Input id={`collectedBy-${parcel.id}`} name="collectedBy" maxLength={120} autoComplete="off" autoFocus />
          </Field>
          <DialogFooter>
            <SubmitButton pendingText="กำลังบันทึก…">
              <Check /> จ่ายของแล้ว
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** ตีกลับผู้ส่ง — ปิดรายการโดยไม่ต้องลบ ประวัติยังอยู่ */
export function ReturnDialog({ parcel }: { parcel: ParcelRow }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CornerUpLeft /> ตีกลับ
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ตีกลับพัสดุของ {parcel.recipient}?</AlertDialogTitle>
          <AlertDialogDescription>
            ใช้เมื่อไม่มีคนมารับ หรือผู้เช่าย้ายออกไปแล้ว · รายการจะยังอยู่ในประวัติ ไม่ได้ถูกลบ
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={returnParcel}>
          <input type="hidden" name="id" value={parcel.id} />
          <AlertDialogFooter>
            <AlertDialogCancel type="button">ยังไม่ตีกลับ</AlertDialogCancel>
            <SubmitButton variant="destructive" pendingText="กำลังบันทึก…">
              ตีกลับผู้ส่ง
            </SubmitButton>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** ลบทิ้ง — ไว้แก้ตอนบันทึกผิดห้องหรือกรอกซ้ำ */
export function DeleteParcel({ parcel }: { parcel: ParcelRow }) {
  return (
    <ConfirmDelete
      action={deleteParcel}
      fields={{ id: parcel.id }}
      title={`ลบรายการพัสดุของ ${parcel.recipient}?`}
      description="ใช้เมื่อบันทึกผิดเท่านั้น ถ้าของถูกจ่ายไปแล้วหรือตีกลับ ให้ใช้ปุ่มนั้นแทนเพื่อเก็บประวัติไว้"
      confirmText="ลบรายการ"
      trigger={
        <Button variant="ghost" size="icon-sm" className="hover:text-destructive opacity-60" aria-label={`ลบรายการพัสดุของ ${parcel.recipient}`}>
          <Trash2 className="size-3.5" />
        </Button>
      }
    />
  );
}

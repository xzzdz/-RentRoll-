"use client";

import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { voidAction } from "../actions";

export function VoidDialog({ invoiceId, isDraft }: { invoiceId: string; isDraft: boolean }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-destructive w-full">
          <Ban /> {isDraft ? "ลบบิลร่าง" : "ยกเลิกบิล"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isDraft ? "ลบบิลร่าง?" : "ยกเลิกบิลนี้?"}</DialogTitle>
          <DialogDescription>
            {isDraft
              ? "ลบแล้วสร้างใหม่ได้จากหน้าบิล (กด สร้าง/อัปเดตบิลร่าง)"
              : "บิลจะถูกเก็บไว้เป็น 'ยกเลิก' และปลดออกจากรอบ เพื่อให้ออกบิลใหม่แทนได้ · ยกเลิกไม่ได้ถ้ามีการรับชำระแล้ว"}
          </DialogDescription>
        </DialogHeader>
        <form action={voidAction} className="grid gap-3">
          <input type="hidden" name="invoiceId" value={invoiceId} />
          {!isDraft && (
            <Field id="reason" label="เหตุผล">
              <Input id="reason" name="reason" required placeholder="เช่น จดมิเตอร์ผิด" />
            </Field>
          )}
          <DialogFooter>
            <SubmitButton variant="destructive">{isDraft ? "ลบบิลร่าง" : "ยืนยันยกเลิก"}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

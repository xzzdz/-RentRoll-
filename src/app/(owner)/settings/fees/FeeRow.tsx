"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { money } from "@/lib/format";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteFee, updateFee } from "../actions";

export type FeeView = {
  id: string;
  name: string;
  amount: number;
  charge: "MONTHLY" | "ONE_TIME";
  isDefault: boolean;
  isActive: boolean;
  usedBy: number;
};

export function FeeRow({ fee }: { fee: FeeView }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <Card className={fee.isActive ? "" : "opacity-60"}>
        <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="min-w-0 flex-1">
            <b className="font-display text-[15px]">{fee.name}</b>
            <div className="text-subtle flex flex-wrap items-center gap-x-2 text-[12px]">
              <span>{fee.charge === "MONTHLY" ? "ทุกเดือน" : "ครั้งเดียว"}</span>
              {fee.isDefault && <span>· ใส่ให้สัญญาใหม่</span>}
              {fee.usedBy > 0 && <span>· ใช้อยู่ {fee.usedBy} สัญญา</span>}
            </div>
          </div>
          {!fee.isActive && <Badge variant="muted">ปิดใช้งาน</Badge>}
          <span className="num text-[15px] font-semibold">{money(fee.amount, 0)}</span>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} aria-label={`แก้ไข ${fee.name}`}>
            <Pencil />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/40">
      <CardContent>
        <form action={updateFee} className="grid gap-3">
          <input type="hidden" name="id" value={fee.id} />
          <div className="grid gap-3 sm:grid-cols-[1fr_130px]">
            <Field id={`name_${fee.id}`} label="ชื่อรายการ">
              <Input id={`name_${fee.id}`} name="name" defaultValue={fee.name} required maxLength={60} />
            </Field>
            <Field id={`amount_${fee.id}`} label="ราคา" unit="฿">
              <Input
                id={`amount_${fee.id}`}
                name="amount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                defaultValue={fee.amount}
                className="num pr-7"
              />
            </Field>
          </div>
          <Field id={`charge_${fee.id}`} label="เก็บเมื่อไหร่">
            <Select name="charge" defaultValue={fee.charge}>
              <SelectTrigger id={`charge_${fee.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MONTHLY">ทุกเดือน</SelectItem>
                <SelectItem value="ONE_TIME">ครั้งเดียวตอนทำสัญญา</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Checkbox id={`def_${fee.id}`} name="isDefault" defaultChecked={fee.isDefault} />
              <Label htmlFor={`def_${fee.id}`} className="font-normal">
                ใส่ให้ทุกสัญญาใหม่
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id={`act_${fee.id}`} name="isActive" defaultChecked={fee.isActive} />
              <Label htmlFor={`act_${fee.id}`} className="font-normal">
                เปิดใช้งาน
              </Label>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              <X /> ยกเลิก
            </Button>
            <SubmitButton pendingText="กำลังบันทึก…">
              <Check /> บันทึก
            </SubmitButton>
          </div>
        </form>
        {/* ฟอร์มลบต้องอยู่นอกฟอร์มแก้ไข — HTML ซ้อน form ไม่ได้ */}
        <DeleteFeeDialog fee={fee} />
      </CardContent>
    </Card>
  );
}

function DeleteFeeDialog({ fee }: { fee: FeeView }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="text-destructive mt-2">
          <Trash2 /> ลบรายการนี้
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ลบ &ldquo;{fee.name}&rdquo;?</DialogTitle>
          <DialogDescription>
            {fee.usedBy > 0
              ? `มี ${fee.usedBy} สัญญาใช้รายการนี้อยู่ ระบบจะปิดใช้งานแทนการลบ เพื่อไม่ให้บิลเก่าเสียหาย — สัญญาใหม่จะไม่เห็นรายการนี้อีก`
              : "รายการนี้ยังไม่เคยถูกใช้ในสัญญาไหน ลบออกได้เลย"}
          </DialogDescription>
        </DialogHeader>
        <form action={deleteFee}>
          <input type="hidden" name="id" value={fee.id} />
          <DialogFooter>
            <SubmitButton variant="destructive" pendingText="กำลังลบ…">
              {fee.usedBy > 0 ? "ปิดใช้งานรายการนี้" : "ลบรายการ"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

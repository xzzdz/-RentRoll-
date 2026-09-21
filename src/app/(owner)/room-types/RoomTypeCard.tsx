"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { money } from "@/lib/format";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { deleteRoomType, updateRoomType } from "./actions";

export type RoomTypeView = {
  id: string;
  name: string;
  baseRent: number;
  deposit: number;
  description: string | null;
  roomCount: number;
};

export function RoomTypeCard({ type }: { type: RoomTypeView }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="min-w-0 flex-1">
            <b className="font-display text-[15px]">{type.name}</b>
            <div className="text-subtle text-[12px]">
              ประกัน <span className="num">{money(type.deposit, 0)}</span> บาท
              {type.description ? ` · ${type.description}` : ""}
            </div>
          </div>
          <Badge variant="muted">{type.roomCount} ห้อง</Badge>
          <div className="text-right">
            <span className="num text-[15px] font-semibold">{money(type.baseRent, 0)}</span>
            <span className="text-subtle text-[11px]"> /เดือน</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} aria-label={`แก้ไข ${type.name}`}>
            <Pencil />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/40">
      <CardContent>
        <form action={updateRoomType} className="grid gap-3">
          <input type="hidden" name="id" value={type.id} />
          <Field id={`n_${type.id}`} label="ชื่อประเภท">
            <Input id={`n_${type.id}`} name="name" defaultValue={type.name} required maxLength={40} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id={`r_${type.id}`} label="ค่าเช่า/เดือน" unit="฿">
              <Input id={`r_${type.id}`} name="baseRent" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={type.baseRent} className="num pr-7" />
            </Field>
            <Field id={`d_${type.id}`} label="เงินประกัน" unit="฿">
              <Input id={`d_${type.id}`} name="deposit" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={type.deposit} className="num pr-7" />
            </Field>
          </div>
          <Field id={`de_${type.id}`} label="รายละเอียด">
            <Input id={`de_${type.id}`} name="description" defaultValue={type.description ?? ""} maxLength={120} />
          </Field>
          <p className="text-subtle text-[12px]">แก้ค่าเช่าแล้วสัญญาเดิมไม่เปลี่ยน — มีผลกับสัญญาที่ทำหลังจากนี้เท่านั้น</p>
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              <X /> ยกเลิก
            </Button>
            <SubmitButton pendingText="กำลังบันทึก…">
              <Check /> บันทึก
            </SubmitButton>
          </div>
        </form>
        <DeleteDialog type={type} />
      </CardContent>
    </Card>
  );
}

function DeleteDialog({ type }: { type: RoomTypeView }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="text-destructive mt-2" disabled={type.roomCount > 0}>
          <Trash2 /> ลบประเภทนี้
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ลบ &ldquo;{type.name}&rdquo;?</DialogTitle>
          <DialogDescription>ไม่มีห้องไหนใช้ประเภทนี้แล้ว ลบได้เลย</DialogDescription>
        </DialogHeader>
        <form action={deleteRoomType}>
          <input type="hidden" name="id" value={type.id} />
          <DialogFooter>
            <SubmitButton variant="destructive" pendingText="กำลังลบ…">
              ลบประเภทห้อง
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

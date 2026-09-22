"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { updateRoom } from "./actions";

export type RoomTypeOption = { id: string; name: string; baseRent: number };

/**
 * แก้ประเภทห้อง ราคาพิเศษ และหมายเหตุของห้องเดียว
 * ประเภทห้องเลือกไว้ใน state เพื่อให้ตัวอย่างค่าเช่าด้านล่างเปลี่ยนตามทันที
 */
export function EditRoomDialog({
  roomId,
  roomNumber,
  roomTypes,
  currentTypeId,
  rentOverride,
  note,
  occupied,
}: {
  roomId: string;
  roomNumber: string;
  roomTypes: RoomTypeOption[];
  currentTypeId: string;
  rentOverride: number | null;
  note: string | null;
  occupied: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [typeId, setTypeId] = useState(currentTypeId);
  const [rent, setRent] = useState(rentOverride?.toString() ?? "");

  const selected = roomTypes.find((t) => t.id === typeId);
  const effective = rent.trim() === "" ? (selected?.baseRent ?? 0) : Number(rent);

  // เปิด/ปิดทีไรให้กลับไปตรงกับค่าที่บันทึกไว้เสมอ กันค่าค้างจากครั้งก่อน
  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setTypeId(currentTypeId);
      setRent(rentOverride?.toString() ?? "");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil /> แก้ข้อมูลห้อง
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>แก้ข้อมูลห้อง {roomNumber}</DialogTitle>
          <DialogDescription>
            เปลี่ยนประเภทห้องและราคาได้ตลอด · มีผลกับสัญญาฉบับถัดไปเท่านั้น สัญญาและบิลที่ออกไปแล้วใช้ราคาเดิมที่บันทึกไว้
          </DialogDescription>
        </DialogHeader>

        <form action={updateRoom} className="grid gap-3">
          <input type="hidden" name="roomId" value={roomId} />

          <Field id="roomTypeId" label="ประเภทห้อง" hint="ค่าเช่าตั้งต้นและเงินประกันมาจากประเภทห้อง — แก้อัตราได้ที่หน้าประเภทห้อง">
            <Select name="roomTypeId" value={typeId} onValueChange={setTypeId}>
              <SelectTrigger id="roomTypeId" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roomTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} · <span className="num">{money(t.baseRent, 0)}</span> บาท
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            id="rentOverride"
            label="ราคาพิเศษเฉพาะห้องนี้"
            unit="บาท"
            hint={`เว้นว่างไว้ถ้าใช้ราคาตามประเภทห้อง (${money(selected?.baseRent ?? 0, 0)} บาท)`}
          >
            <Input
              id="rentOverride"
              name="rentOverride"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              className="num pr-12"
              value={rent}
              onChange={(e) => setRent(e.target.value)}
              placeholder={String(selected?.baseRent ?? "")}
            />
          </Field>

          <Field id="note" label="หมายเหตุ" hint="เช่น ห้องมุม วิวสระ แอร์เพิ่งเปลี่ยน — เห็นเฉพาะฝั่งเจ้าของ">
            <Textarea id="note" name="note" rows={2} defaultValue={note ?? ""} placeholder="ไม่ใส่ก็ได้" />
          </Field>

          <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-[12.5px]">
            ค่าเช่าที่จะใช้กับสัญญาใหม่ <b className="num text-foreground">{money(Number.isFinite(effective) ? effective : 0, 0)}</b> บาท/เดือน
            {occupied && " · ห้องนี้มีผู้เช่าอยู่ ค่าเช่าตามสัญญาปัจจุบันไม่เปลี่ยน"}
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <SubmitButton pendingText="กำลังบันทึก…">บันทึก</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

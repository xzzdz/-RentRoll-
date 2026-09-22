"use client";

import { useState } from "react";
import { PackagePlus, X } from "lucide-react";
import { CARRIERS, SIZES } from "@/lib/parcel";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { logParcel } from "./actions";

/**
 * ฟอร์มรับพัสดุเข้า — ออกแบบจากมือถือ เพราะคนรับของยืนอยู่หน้าเคาน์เตอร์
 * ช่องแรกคือเลขห้อง และพิมพ์ได้เลย (datalist ช่วยเดา) ไม่ต้องเลื่อนหารายการห้องเป็นร้อย
 * ที่เหลือเว้นว่างได้หมด ของด่วน ๆ กรอกแค่ห้องแล้วกดบันทึกก็จบ
 */
export function ParcelForm({ roomNumbers }: { roomNumbers: string[] }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button className="h-12 w-full" onClick={() => setOpen(true)}>
        <PackagePlus /> รับพัสดุเข้า
      </Button>
    );
  }

  return (
    <Card className="border-primary/40">
      <CardContent>
        <form action={logParcel} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
            <Field id="room" label="ห้อง" hint="พิมพ์เลขห้องได้เลย">
              <Input id="room" name="room" list="parcel-rooms" autoFocus autoComplete="off" className="num" placeholder="A-301" />
              <datalist id="parcel-rooms">
                {roomNumbers.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </Field>
            <Field id="recipient" label="ชื่อหน้ากล่อง" hint="เว้นว่าง = ใช้ชื่อผู้เช่าปัจจุบันของห้องนั้น">
              <Input id="recipient" name="recipient" maxLength={120} autoComplete="off" />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field id="carrier" label="ขนส่ง">
              <Input id="carrier" name="carrier" list="parcel-carriers" maxLength={40} autoComplete="off" placeholder="Flash Express" />
              <datalist id="parcel-carriers">
                {CARRIERS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field id="trackingNo" label="เลขพัสดุ">
              <Input id="trackingNo" name="trackingNo" maxLength={60} autoComplete="off" className="num" />
            </Field>
            <Field id="size" label="ขนาด">
              <Input id="size" name="size" list="parcel-sizes" maxLength={30} autoComplete="off" placeholder="กล่องเล็ก" />
              <datalist id="parcel-sizes">
                {SIZES.map((x) => (
                  <option key={x} value={x} />
                ))}
              </datalist>
            </Field>
          </div>

          <Field id="note" label="หมายเหตุ" hint="เช่น วางไว้ชั้นวางที่ 2 · ของเย็นอยู่ในตู้เย็น">
            <Input id="note" name="note" maxLength={200} autoComplete="off" />
          </Field>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              <X /> ยกเลิก
            </Button>
            <SubmitButton pendingText="กำลังบันทึก…">
              <PackagePlus /> บันทึกพัสดุ
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

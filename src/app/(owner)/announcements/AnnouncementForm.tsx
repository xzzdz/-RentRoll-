"use client";

import { useState } from "react";
import { Megaphone, Save } from "lucide-react";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createAnnouncement } from "./actions";

export type BuildingOption = { id: string; name: string };

const TEMPLATES = [
  { title: "แจ้งน้ำประปาหยุดจ่ายชั่วคราว", body: "เรียนผู้เช่าทุกท่าน\n\nวันที่ ... เวลา ... ถึง ... น. จะมีการหยุดจ่ายน้ำประปาเพื่อซ่อมบำรุง ขออภัยในความไม่สะดวก" },
  { title: "แจ้งกำหนดชำระค่าเช่า", body: "เรียนผู้เช่าทุกท่าน\n\nกรุณาชำระค่าเช่าภายในวันที่ ... ของทุกเดือน หากเลยกำหนดจะมีค่าปรับตามสัญญา" },
  { title: "แจ้งวันเก็บขยะ", body: "เรียนผู้เช่าทุกท่าน\n\nกรุณานำขยะมาทิ้งที่จุดรวมก่อนเวลา ... น. ของทุกวัน ..." },
];

export function AnnouncementForm({ buildings, today }: { buildings: BuildingOption[]; today: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  if (!open) {
    return (
      <Button variant="outline" className="h-12 w-full border-dashed" onClick={() => setOpen(true)}>
        <Megaphone /> เขียนประกาศใหม่
      </Button>
    );
  }

  return (
    <Card className="border-primary/40">
      <CardContent>
        <form action={createAnnouncement} className="grid gap-3">
          <Field id="title" label="หัวข้อ">
            <Input id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} autoFocus />
          </Field>

          <div className="flex flex-wrap gap-1.5">
            <span className="text-subtle self-center text-[12px]">ตัวอย่าง:</span>
            {TEMPLATES.map((t) => (
              <button
                key={t.title}
                type="button"
                onClick={() => {
                  setTitle(t.title);
                  setBody(t.body);
                }}
                className="border-border hover:bg-muted rounded-full border px-2.5 py-1 text-[12px]"
              >
                {t.title}
              </button>
            ))}
          </div>

          <Field id="body" label="เนื้อหา">
            <Textarea id="body" name="body" value={body} onChange={(e) => setBody(e.target.value)} rows={5} required />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="buildingId" label="ประกาศถึง">
              <Select name="buildingId">
                <SelectTrigger id="buildingId">
                  <SelectValue placeholder="ทุกตึก" />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      เฉพาะ{b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="expiresAt" label="แสดงถึงวันที่" hint="เว้นว่าง = แสดงตลอด">
              <Input id="expiresAt" name="expiresAt" type="date" min={today} />
            </Field>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="pinned" name="pinned" />
            <Label htmlFor="pinned" className="font-normal">
              ปักหมุดไว้บนสุด
            </Label>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <SubmitButton name="publish" value="0" variant="outline" pendingText="กำลังบันทึก…">
              <Save /> เก็บเป็นร่าง
            </SubmitButton>
            <SubmitButton name="publish" value="1" pendingText="กำลังประกาศ…">
              <Megaphone /> ประกาศเลย
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

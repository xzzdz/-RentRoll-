"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateRooms } from "../actions";

export function RoomGenerator({
  buildingId,
  floors,
  defaultPrefix,
  roomTypes,
  existing,
}: {
  buildingId: string;
  floors: number;
  defaultPrefix: string;
  roomTypes: { id: string; name: string }[];
  existing: number;
}) {
  const [open, setOpen] = useState(existing === 0);
  const [prefix, setPrefix] = useState(defaultPrefix);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(floors);
  const [perFloor, setPerFloor] = useState(8);
  const [start, setStart] = useState(1);
  const [digits, setDigits] = useState(2);

  const floorCount = Math.max(0, to - from + 1);
  const total = floorCount * Math.max(0, perFloor);
  const sample = (floor: number, i: number) => `${prefix}${floor}${String(start + i).padStart(digits, "0")}`;
  const preview = total > 0 ? [sample(from, 0), sample(from, 1), "…", sample(to, Math.max(0, perFloor - 1))] : [];

  if (roomTypes.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground">
          ต้องมีประเภทห้องอย่างน้อยหนึ่งแบบก่อนจึงจะสร้างห้องได้ —{" "}
          <a href="/room-types" className="text-primary hover:underline">
            ไปเพิ่มประเภทห้อง
          </a>
        </CardContent>
      </Card>
    );
  }

  if (!open) {
    return (
      <Button variant="outline" className="h-12 w-full border-dashed" onClick={() => setOpen(true)}>
        <Sparkles /> สร้างห้องเป็นชุด
      </Button>
    );
  }

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="text-primary size-4.5" aria-hidden /> สร้างห้องเป็นชุด
        </CardTitle>
        <CardDescription>ตั้งรูปแบบเลขห้องครั้งเดียว ระบบสร้างให้ทุกชั้น · ห้องที่มีเลขซ้ำจะถูกข้าม</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={generateRooms} className="grid gap-3">
          <input type="hidden" name="buildingId" value={buildingId} />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field id="floorFrom" label="ชั้นแรก">
              <Input
                id="floorFrom"
                name="floorFrom"
                type="number"
                min="1"
                max={floors}
                inputMode="numeric"
                value={from}
                onChange={(e) => setFrom(Number(e.target.value))}
                className="num"
              />
            </Field>
            <Field id="floorTo" label="ชั้นสุดท้าย">
              <Input
                id="floorTo"
                name="floorTo"
                type="number"
                min="1"
                max={floors}
                inputMode="numeric"
                value={to}
                onChange={(e) => setTo(Number(e.target.value))}
                className="num"
              />
            </Field>
            <Field id="perFloor" label="ห้อง/ชั้น">
              <Input
                id="perFloor"
                name="perFloor"
                type="number"
                min="1"
                max="60"
                inputMode="numeric"
                value={perFloor}
                onChange={(e) => setPerFloor(Number(e.target.value))}
                className="num"
              />
            </Field>
            <Field id="startNumber" label="เริ่มที่เลข">
              <Input
                id="startNumber"
                name="startNumber"
                type="number"
                min="0"
                max="99"
                inputMode="numeric"
                value={start}
                onChange={(e) => setStart(Number(e.target.value))}
                className="num"
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_120px_1fr]">
            <Field id="prefix" label="ตัวนำหน้า" hint="เว้นว่างได้">
              <Input id="prefix" name="prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} maxLength={6} className="num" />
            </Field>
            <Field id="digits" label="หลักเลขห้อง">
              <Select name="digits" value={String(digits)} onValueChange={(v) => setDigits(Number(v))}>
                <SelectTrigger id="digits">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 หลัก</SelectItem>
                  <SelectItem value="2">2 หลัก</SelectItem>
                  <SelectItem value="3">3 หลัก</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field id="roomTypeId" label="ประเภทห้อง" hint="แก้รายห้องทีหลังได้">
              <Select name="roomTypeId" defaultValue={roomTypes[0].id}>
                <SelectTrigger id="roomTypeId">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roomTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="bg-muted rounded-lg px-3 py-2 text-[13px]">
            จะสร้าง <b className="num">{total}</b> ห้อง ({floorCount} ชั้น × {perFloor} ห้อง)
            {preview.length > 0 && (
              <div className="text-muted-foreground num mt-1 flex flex-wrap gap-1.5 text-[12px]">
                {preview.map((p, i) => (
                  <span key={i} className="bg-card rounded border px-1.5 py-0.5">
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t pt-3">
            {existing > 0 && (
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                ยกเลิก
              </Button>
            )}
            <SubmitButton disabled={total < 1} pendingText="กำลังสร้าง…">
              <Sparkles /> สร้าง {total} ห้อง
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

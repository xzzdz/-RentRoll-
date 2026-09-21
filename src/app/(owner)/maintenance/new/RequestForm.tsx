"use client";

import { useActionState, useState } from "react";
import { Loader2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/Field";
import { createAction, type FormState } from "../actions";

export type RoomOption = { id: string; number: string; building: string; tenant: string | null };
export type TechOption = { id: string; name: string };

export function RequestForm({
  rooms,
  techs,
  categories,
  defaultRoomId,
  today,
}: {
  rooms: RoomOption[];
  techs: TechOption[];
  categories: string[];
  defaultRoomId?: string;
  today: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(createAction, undefined);
  const [roomId, setRoomId] = useState(defaultRoomId && rooms.some((r) => r.id === defaultRoomId) ? defaultRoomId : "");
  const [assignedToId, setAssignedToId] = useState("");
  const room = rooms.find((r) => r.id === roomId);
  const buildings = [...new Set(rooms.map((r) => r.building))];

  return (
    <form action={action} className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="grid content-start gap-4">
        <Card>
          <CardHeader>
            <CardTitle>รายละเอียดงาน</CardTitle>
            <CardDescription>{room?.tenant ? `ผู้เช่าปัจจุบัน: ${room.tenant}` : "เลือกห้องเพื่อผูกงานกับผู้เช่าปัจจุบัน"}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field id="roomId" label="ห้อง">
              <Select name="roomId" value={roomId} onValueChange={setRoomId} required>
                <SelectTrigger id="roomId">
                  <SelectValue placeholder="เลือกห้อง" />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((b) => (
                    <SelectGroup key={b}>
                      <SelectLabel>{b}</SelectLabel>
                      {rooms
                        .filter((r) => r.building === b)
                        .map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.number}
                            {r.tenant ? ` · ${r.tenant}` : " · ว่าง"}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field id="category" label="หมวดงาน">
              <Select name="category" defaultValue={categories[0]}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field id="title" label="เรื่องที่แจ้ง" className="sm:col-span-2" hint="สรุปสั้น ๆ เช่น แอร์ไม่เย็น มีน้ำหยด">
              <Input id="title" name="title" required maxLength={120} placeholder="แอร์ไม่เย็น มีน้ำหยด" />
            </Field>

            <Field id="description" label="รายละเอียดเพิ่มเติม" className="sm:col-span-2">
              <Textarea id="description" name="description" rows={3} placeholder="อาการที่พบ จุดที่เสีย ฯลฯ" />
            </Field>

            <Field id="priority" label="ความเร่งด่วน">
              <Select name="priority" defaultValue="NORMAL">
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">ไม่เร่ง</SelectItem>
                  <SelectItem value="NORMAL">ปกติ</SelectItem>
                  <SelectItem value="URGENT">ด่วน</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field id="preferredTime" label="ช่วงเวลาที่ผู้เช่าสะดวก">
              <Input id="preferredTime" name="preferredTime" maxLength={60} placeholder="เช่น ช่วงเย็นหลัง 17:00" />
            </Field>
          </CardContent>
        </Card>
      </div>

      <div className="grid content-start gap-4">
        <Card>
          <CardHeader>
            <CardTitle>มอบหมายช่าง</CardTitle>
            <CardDescription>ข้ามได้ — งานจะอยู่สถานะ &ldquo;แจ้งใหม่&rdquo; รอมอบหมายทีหลัง</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Field id="assignedToId" label="ช่าง">
              <Select name="assignedToId" value={assignedToId} onValueChange={setAssignedToId}>
                <SelectTrigger id="assignedToId">
                  <SelectValue placeholder="ยังไม่มอบหมาย" />
                </SelectTrigger>
                <SelectContent>
                  {techs.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {assignedToId && (
              <Field id="scheduledAt" label="วันนัดเข้าซ่อม">
                <Input id="scheduledAt" name="scheduledAt" type="date" min={today} />
              </Field>
            )}
            {techs.length === 0 && <p className="text-subtle text-xs">ยังไม่มีบัญชีช่างในระบบ</p>}
          </CardContent>
        </Card>

        {state?.error && (
          <p role="alert" className="bg-bad-soft text-destructive rounded-md px-3 py-2 text-[13px]">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending || !roomId} size="lg">
          {pending ? <Loader2 className="animate-spin" /> : <Wrench />}
          เปิดงานแจ้งซ่อม
        </Button>
      </div>
    </form>
  );
}

"use client";

import { Save, Trash2 } from "lucide-react";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { deleteBuilding, updateBuilding } from "../actions";

export function BuildingForm({
  building,
  roomCount,
}: {
  building: { id: string; name: string; code: string | null; floors: number };
  roomCount: number;
}) {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลตึก</CardTitle>
          <CardDescription>ลดจำนวนชั้นได้เฉพาะเมื่อชั้นบนไม่มีห้องเหลืออยู่</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateBuilding} className="grid gap-3">
            <input type="hidden" name="id" value={building.id} />
            <Field id="edName" label="ชื่อตึก">
              <Input id="edName" name="name" defaultValue={building.name} required maxLength={40} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="edCode" label="ตัวนำหน้าเลขห้อง">
                <Input id="edCode" name="code" defaultValue={building.code ?? ""} maxLength={4} className="num" />
              </Field>
              <Field id="edFloors" label="จำนวนชั้น">
                <Input id="edFloors" name="floors" type="number" min="1" max="60" inputMode="numeric" defaultValue={building.floors} required className="num" />
              </Field>
            </div>
            <div className="flex justify-end border-t pt-3">
              <SubmitButton pendingText="กำลังบันทึก…">
                <Save /> บันทึก
              </SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">ลบตึกนี้</CardTitle>
          <CardDescription>
            {roomCount > 0 ? `ลบไม่ได้ตอนนี้ — ยังมี ${roomCount} ห้องอยู่ในตึก` : "ตึกนี้ไม่มีห้องแล้ว ลบได้"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="text-destructive" disabled={roomCount > 0}>
                <Trash2 /> ลบตึก
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>ลบ {building.name}?</DialogTitle>
                <DialogDescription>ผังชั้นที่จัดไว้จะหายไปด้วย และย้อนกลับไม่ได้</DialogDescription>
              </DialogHeader>
              <form action={deleteBuilding}>
                <input type="hidden" name="id" value={building.id} />
                <DialogFooter>
                  <SubmitButton variant="destructive" pendingText="กำลังลบ…">
                    ยืนยันลบตึก
                  </SubmitButton>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}

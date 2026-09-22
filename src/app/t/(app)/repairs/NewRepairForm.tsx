"use client";

import { useActionState, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Field } from "@/components/Field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createRepair, type RepairState } from "./actions";

/** ช่วงเวลาที่ช่างเข้าได้ — ให้เลือกเป็นปุ่ม ไม่ต้องพิมพ์ */
const TIMES = ["เช้า (09:00–12:00)", "บ่าย (13:00–17:00)", "เย็น (17:00–20:00)", "เวลาไหนก็ได้"];

export function NewRepairForm({ categories, roomNumber }: { categories: string[]; roomNumber: string }) {
  const [state, action, pending] = useActionState<RepairState, FormData>(createRepair, undefined);
  const [category, setCategory] = useState(categories[0] ?? "อื่น ๆ");
  const [time, setTime] = useState(TIMES[3]);

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="preferredTime" value={time} />

      <Card>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <span className="text-muted-foreground text-[12.5px] font-semibold">เรื่องอะไร</span>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  aria-pressed={c === category}
                  className={cn(
                    "min-h-10 rounded-lg border px-3 text-[13.5px] font-medium",
                    c === category ? "bg-accent text-accent-foreground border-primary ring-primary/30 ring-2" : "bg-card hover:bg-muted",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <Field id="title" label="อาการโดยย่อ" hint="เช่น แอร์ไม่เย็น · ก๊อกน้ำรั่ว">
            <Input id="title" name="title" required maxLength={120} autoFocus className="h-11" />
          </Field>

          <Field id="description" label="รายละเอียดเพิ่มเติม" hint="ไม่ใส่ก็ได้ แต่ยิ่งละเอียด ช่างยิ่งเตรียมของมาถูก">
            <Textarea id="description" name="description" rows={3} maxLength={600} />
          </Field>

          <div className="grid gap-1.5">
            <span className="text-muted-foreground text-[12.5px] font-semibold">ช่วงเวลาที่สะดวกให้ช่างเข้า</span>
            <div className="flex flex-wrap gap-1.5">
              {TIMES.map((x) => (
                <button
                  key={x}
                  type="button"
                  onClick={() => setTime(x)}
                  aria-pressed={x === time}
                  className={cn(
                    "min-h-10 rounded-lg border px-3 text-[13px]",
                    x === time ? "bg-accent text-accent-foreground border-primary ring-primary/30 ring-2" : "bg-card hover:bg-muted",
                  )}
                >
                  {x}
                </button>
              ))}
            </div>
          </div>

          <Label htmlFor="urgent" className="bg-bad-soft flex items-start gap-2.5 rounded-lg border p-3">
            <Checkbox id="urgent" name="urgent" className="mt-0.5" />
            <span className="grid gap-0.5">
              <b className="text-destructive text-[13.5px] font-semibold">เร่งด่วน</b>
              <span className="text-muted-foreground text-[12.5px] leading-snug">ใช้เมื่อกระทบการอยู่อาศัยจริง ๆ เช่น น้ำรั่วท่วม ไฟช็อต ประตูล็อกไม่ได้</span>
            </span>
          </Label>
        </CardContent>
      </Card>

      {state?.error && (
        <p role="alert" className="bg-bad-soft text-destructive rounded-md px-3 py-2 text-[13px]">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="h-12 text-[15px]">
        {pending ? <Loader2 className="animate-spin" /> : <Send />}
        {pending ? "กำลังส่ง…" : `แจ้งซ่อมห้อง ${roomNumber}`}
      </Button>
    </form>
  );
}

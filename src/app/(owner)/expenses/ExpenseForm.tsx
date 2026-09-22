"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY } from "@/lib/expense";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createExpense } from "./actions";

export type BuildingOption = { id: string; name: string };

export function ExpenseForm({ buildings, period, today }: { buildings: BuildingOption[]; period: string; today: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("UTILITY");

  if (!open) {
    return (
      <Button variant="outline" className="h-12 w-full border-dashed" onClick={() => setOpen(true)}>
        <Plus /> บันทึกรายจ่าย
      </Button>
    );
  }

  return (
    <Card className="border-primary/40">
      <CardContent>
        <form action={createExpense} className="grid gap-3">
          <input type="hidden" name="period" value={period} />

          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <Field id="description" label="รายการ">
              <Input id="description" name="description" required maxLength={120} placeholder="เช่น ค่าไฟส่วนกลางเดือนนี้" autoFocus />
            </Field>
            <Field id="amount" label="จำนวนเงิน" unit="฿">
              <Input id="amount" name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" required className="num pr-7" />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="category" label="หมวด" hint={EXPENSE_CATEGORY[category as keyof typeof EXPENSE_CATEGORY]?.hint}>
              <Select name="category" value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {EXPENSE_CATEGORY[c].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="spentAt" label="วันที่จ่าย">
              <Input id="spentAt" name="spentAt" type="date" defaultValue={today} required />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="buildingId" label="ตึก" hint="เว้นว่าง = ค่าใช้จ่ายของทั้งหอ">
              <Select name="buildingId">
                <SelectTrigger id="buildingId">
                  <SelectValue placeholder="ทั้งหอ" />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="note" label="หมายเหตุ">
              <Input id="note" name="note" maxLength={120} placeholder="เช่น เลขที่ใบเสร็จ" />
            </Field>
          </div>

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <SubmitButton pendingText="กำลังบันทึก…">
              <Plus /> บันทึก
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

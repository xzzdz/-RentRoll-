"use client";

import { useState } from "react";
import type { ExpenseCategory } from "@prisma/client";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY } from "@/lib/expense";
import { money } from "@/lib/format";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteExpense, updateExpense } from "./actions";
import type { BuildingOption } from "./ExpenseForm";

export type ExpenseView = {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  spentAt: string;
  spentAtLabel: string;
  buildingId: string | null;
  buildingName: string | null;
  note: string | null;
};

export function ExpenseRow({ expense, buildings, period }: { expense: ExpenseView; buildings: BuildingOption[]; period: string }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="min-w-0 flex-1">
            <b className="text-[14.5px]">{expense.description}</b>
            <div className="text-subtle flex flex-wrap items-center gap-x-2 text-[12px]">
              <span>{expense.spentAtLabel}</span>
              <span>· {EXPENSE_CATEGORY[expense.category].label}</span>
              {expense.buildingName && <span>· {expense.buildingName}</span>}
              {expense.note && <span>· {expense.note}</span>}
            </div>
          </div>
          {!expense.buildingName && <Badge variant="muted">ทั้งหอ</Badge>}
          <span className="num text-[15px] font-semibold">{money(expense.amount, 0)}</span>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} aria-label={`แก้ไข ${expense.description}`}>
            <Pencil />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/40">
      <CardContent>
        <form action={updateExpense} className="grid gap-3">
          <input type="hidden" name="id" value={expense.id} />
          <input type="hidden" name="period" value={period} />

          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <Field id={`d_${expense.id}`} label="รายการ">
              <Input id={`d_${expense.id}`} name="description" defaultValue={expense.description} required maxLength={120} />
            </Field>
            <Field id={`a_${expense.id}`} label="จำนวนเงิน" unit="฿">
              <Input
                id={`a_${expense.id}`}
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                defaultValue={expense.amount}
                required
                className="num pr-7"
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field id={`c_${expense.id}`} label="หมวด">
              <Select name="category" defaultValue={expense.category}>
                <SelectTrigger id={`c_${expense.id}`}>
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
            <Field id={`s_${expense.id}`} label="วันที่จ่าย">
              <Input id={`s_${expense.id}`} name="spentAt" type="date" defaultValue={expense.spentAt} required />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field id={`b_${expense.id}`} label="ตึก">
              <Select name="buildingId" defaultValue={expense.buildingId ?? undefined}>
                <SelectTrigger id={`b_${expense.id}`}>
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
            <Field id={`n_${expense.id}`} label="หมายเหตุ">
              <Input id={`n_${expense.id}`} name="note" defaultValue={expense.note ?? ""} maxLength={120} />
            </Field>
          </div>

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              <X /> ยกเลิก
            </Button>
            <SubmitButton pendingText="กำลังบันทึก…">
              <Check /> บันทึก
            </SubmitButton>
          </div>
        </form>

        {/* ฟอร์มลบต้องอยู่นอกฟอร์มแก้ไข — HTML ซ้อน form ไม่ได้ */}
        <Dialog>
          <DialogTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="text-destructive mt-2">
              <Trash2 /> ลบรายการนี้
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ลบ &ldquo;{expense.description}&rdquo;?</DialogTitle>
              <DialogDescription>ยอด {money(expense.amount)} บาท จะถูกลบออกจากรายจ่ายเดือนนี้และกำไร-ขาดทุนจะคิดใหม่</DialogDescription>
            </DialogHeader>
            <form action={deleteExpense}>
              <input type="hidden" name="id" value={expense.id} />
              <input type="hidden" name="period" value={period} />
              <DialogFooter>
                <SubmitButton variant="destructive" pendingText="กำลังลบ…">
                  ลบรายจ่าย
                </SubmitButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

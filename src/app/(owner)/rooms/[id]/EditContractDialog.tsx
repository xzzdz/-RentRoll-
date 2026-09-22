"use client";

import { useState } from "react";
import { FilePenLine } from "lucide-react";
import { money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { updateContract } from "@/app/(owner)/contracts/actions";

/** บวกเดือนจาก "YYYY-MM-DD" โดยไม่ให้วันเลื่อน (31 ม.ค. +1 เดือน = 28/29 ก.พ.) */
function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const last = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + months, Math.min(d, last))).toISOString().slice(0, 10);
}

export function EditContractDialog({
  contractId,
  contractNo,
  monthlyRent,
  depositAmount,
  startDate,
  endDate,
  note,
  issuedCount,
}: {
  contractId: string;
  contractNo: string;
  monthlyRent: number;
  depositAmount: number;
  startDate: string;
  endDate: string | null;
  note: string | null;
  issuedCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [rent, setRent] = useState(String(monthlyRent));
  const [end, setEnd] = useState(endDate ?? "");

  // ออกบิลไปแล้ว = ล็อกวันเริ่มสัญญา เพราะมันไปเปลี่ยนการคิดค่าเช่าตามวันของเดือนแรก
  const startLocked = issuedCount > 0;
  const base = end || endDate || startDate;

  function reset(next: boolean) {
    setOpen(next);
    if (!next) {
      setRent(String(monthlyRent));
      setEnd(endDate ?? "");
    }
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FilePenLine /> แก้ไข / ต่อสัญญา
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>สัญญา {contractNo}</DialogTitle>
          <DialogDescription>
            ค่าเช่าใหม่มีผลกับบิลรอบถัดไปเท่านั้น · บิลที่ออกไปแล้วเก็บยอดของตัวเองไว้ ไม่ถูกแก้ย้อนหลัง
          </DialogDescription>
        </DialogHeader>

        <form action={updateContract} className="grid gap-3">
          <input type="hidden" name="contractId" value={contractId} />

          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="monthlyRent" label="ค่าเช่า" unit="บาท/เดือน">
              <Input
                id="monthlyRent"
                name="monthlyRent"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                className="num pr-20"
                value={rent}
                onChange={(e) => setRent(e.target.value)}
                required
              />
            </Field>
            <Field id="depositAmount" label="เงินประกัน" unit="บาท">
              <Input
                id="depositAmount"
                name="depositAmount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                className="num pr-12"
                defaultValue={depositAmount}
                required
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              id="startDate"
              label="วันเริ่มสัญญา"
              hint={startLocked ? `ล็อกไว้ — ออกบิลไปแล้ว ${issuedCount} ใบ` : "แก้ได้เพราะยังไม่มีบิลจริง"}
            >
              <Input id="startDate" name="startDate" type="date" defaultValue={startDate} readOnly={startLocked} required />
            </Field>
            <Field id="endDate" label="วันสิ้นสุด" hint="เว้นว่าง = ไม่กำหนด">
              <Input id="endDate" name="endDate" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </Field>
          </div>

          {/* ต่อสัญญาคือการเลื่อนวันสิ้นสุด ปุ่มลัดนี้คือเหตุผลหลักที่เจ้าของเปิดหน้านี้ */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="eyebrow">ต่อสัญญา</span>
            {[3, 6, 12].map((m) => (
              <Button key={m} type="button" variant="outline" size="sm" onClick={() => setEnd(addMonths(base, m))}>
                +{m} เดือน
              </Button>
            ))}
            {end && (
              <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setEnd("")}>
                ล้างวันสิ้นสุด
              </Button>
            )}
          </div>

          <Field id="contractNote" label="หมายเหตุ">
            <Textarea id="contractNote" name="note" rows={2} defaultValue={note ?? ""} placeholder="ไม่ใส่ก็ได้" />
          </Field>

          <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-[12.5px]">
            ค่าเช่าที่จะใช้กับบิลรอบถัดไป <b className="num text-foreground">{money(Number(rent) || 0, 0)}</b> บาท/เดือน
            {end ? ` · สัญญาถึง ${end}` : " · สัญญาไม่กำหนดวันสิ้นสุด"}
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => reset(false)}>
              ยกเลิก
            </Button>
            <SubmitButton pendingText="กำลังบันทึก…">บันทึก</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

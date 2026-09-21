"use client";

import { useActionState } from "react";
import { Loader2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/Field";
import { assignAction, type FormState } from "../actions";

export function AssignDialog({
  requestId,
  techs,
  currentTechId,
  scheduledAt,
  today,
}: {
  requestId: string;
  techs: { id: string; name: string }[];
  currentTechId: string | null;
  scheduledAt: string | null;
  today: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(assignAction, undefined);
  const reassign = !!currentTechId;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={reassign ? "outline" : "default"} className="w-full">
          <UserCog /> {reassign ? "เปลี่ยนช่าง / นัดใหม่" : "มอบหมายช่าง"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{reassign ? "เปลี่ยนช่าง / นัดใหม่" : "มอบหมายช่าง"}</DialogTitle>
          <DialogDescription>ช่างจะเห็นงานนี้ในหน้างานของตัวเองทันที</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-3">
          <input type="hidden" name="requestId" value={requestId} />
          <Field id="technicianId" label="ช่าง">
            <Select name="technicianId" defaultValue={currentTechId ?? undefined} required>
              <SelectTrigger id="technicianId">
                <SelectValue placeholder="เลือกช่าง" />
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
          <Field id="scheduledAt" label="วันนัดเข้าซ่อม" hint="เว้นว่างได้">
            <Input id="scheduledAt" name="scheduledAt" type="date" min={today} defaultValue={scheduledAt ?? ""} />
          </Field>
          <Field id="assignComment" label="ข้อความถึงช่าง">
            <Input id="assignComment" name="comment" placeholder="เช่น ติดต่อผู้เช่าก่อนเข้า" />
          </Field>
          {state?.error && (
            <p role="alert" className="bg-bad-soft text-destructive rounded-md px-3 py-2 text-[13px]">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending || techs.length === 0}>
              {pending && <Loader2 className="animate-spin" />}
              บันทึก
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

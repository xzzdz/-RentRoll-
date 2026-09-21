"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/Field";
import { completeJobAction, type TechFormState } from "../actions";

export function CompleteJobDialog({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState<TechFormState, FormData>(completeJobAction, undefined);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full" size="lg">
          <CheckCircle2 /> ปิดงาน
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ปิดงานซ่อม</DialogTitle>
          <DialogDescription>ใส่ค่าอะไหล่/ค่าแรงถ้ามี — เจ้าของจะเป็นคนตัดสินใจว่าเรียกเก็บผู้เช่าหรือไม่</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-3">
          <input type="hidden" name="requestId" value={requestId} />
          <Field id="techCost" label="ค่าใช้จ่าย" unit="บาท" hint="เว้นว่างได้ถ้าไม่มีค่าใช้จ่าย">
            <Input id="techCost" name="cost" type="number" min="0" step="0.01" inputMode="decimal" className="num pr-12" placeholder="0.00" />
          </Field>
          <Field id="techComment" label="สรุปงานที่ทำ">
            <Textarea id="techComment" name="comment" rows={3} placeholder="เช่น เปลี่ยนลูกลอย ล้างท่อ" />
          </Field>
          {state?.error && (
            <p role="alert" className="bg-bad-soft text-destructive rounded-md px-3 py-2 text-[13px]">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              ปิดงาน
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

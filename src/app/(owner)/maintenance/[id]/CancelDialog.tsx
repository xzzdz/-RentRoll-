"use client";

import { useActionState } from "react";
import { Ban, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/Field";
import { cancelAction, type FormState } from "../actions";

export function CancelDialog({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(cancelAction, undefined);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-destructive w-full">
          <Ban /> ยกเลิกงาน
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ยกเลิกงานซ่อมนี้?</DialogTitle>
          <DialogDescription>งานจะถูกเก็บไว้เป็นประวัติในสถานะ &ldquo;ยกเลิก&rdquo; และเปิดใหม่ไม่ได้</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-3">
          <input type="hidden" name="requestId" value={requestId} />
          <Field id="cancelComment" label="เหตุผล">
            <Input id="cancelComment" name="comment" required placeholder="เช่น ผู้เช่าแจ้งซ้ำ / แก้ไขเองแล้ว" />
          </Field>
          {state?.error && (
            <p role="alert" className="bg-bad-soft text-destructive rounded-md px-3 py-2 text-[13px]">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              ยืนยันยกเลิก
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

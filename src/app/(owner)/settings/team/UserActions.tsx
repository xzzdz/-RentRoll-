"use client";

import { useActionState } from "react";
import { KeyRound, Loader2, MoreVertical, Power } from "lucide-react";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { resetPassword, setUserActive, type PasswordState } from "../actions";

export function UserActions({ user }: { user: { id: string; name: string; isActive: boolean } }) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(resetPassword, undefined);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`จัดการบัญชี ${user.name}`}>
          <MoreVertical />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user.name}</DialogTitle>
          <DialogDescription>ตั้งรหัสผ่านใหม่ หรือปิดไม่ให้บัญชีนี้เข้าระบบ</DialogDescription>
        </DialogHeader>

        <form action={action} className="grid gap-3">
          <input type="hidden" name="id" value={user.id} />
          <Field id={`pw_${user.id}`} label="รหัสผ่านใหม่" hint="อย่างน้อย 8 ตัวอักษร · แจ้งรหัสนี้ให้เจ้าตัวเปลี่ยนเองภายหลัง">
            <Input id={`pw_${user.id}`} name="password" type="text" minLength={8} required autoComplete="new-password" />
          </Field>
          {state?.error && (
            <p role="alert" className="bg-bad-soft text-destructive rounded-md px-3 py-2 text-[13px]">
              {state.error}
            </p>
          )}
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <KeyRound />}
            ตั้งรหัสผ่านใหม่
          </Button>
        </form>

        <DialogFooter className="border-t pt-3">
          <form action={setUserActive} className="w-full">
            <input type="hidden" name="id" value={user.id} />
            <input type="hidden" name="active" value={user.isActive ? "0" : "1"} />
            <SubmitButton variant={user.isActive ? "destructive" : "default"} className="w-full">
              <Power /> {user.isActive ? "ปิดไม่ให้เข้าระบบ" : "เปิดให้เข้าระบบ"}
            </SubmitButton>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

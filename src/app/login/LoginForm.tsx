"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, type LoginState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="grid gap-1.5">
        <Label htmlFor="id">อีเมล หรือ เบอร์โทร</Label>
        <Input id="id" name="id" autoComplete="username" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">รหัสผ่าน</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state?.error && (
        <p role="alert" className="bg-bad-soft text-destructive rounded-md px-3 py-2 text-[13px]">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </Button>
    </form>
  );
}

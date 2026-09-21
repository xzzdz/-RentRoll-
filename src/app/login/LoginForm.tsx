"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, type LoginState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next ?? ""} />

      <div className="grid gap-1.5">
        <Label htmlFor="id" className="text-muted-foreground text-[12.5px] font-semibold">
          อีเมล หรือ เบอร์โทร
        </Label>
        <Input id="id" name="id" autoComplete="username" inputMode="email" required className="h-12" autoFocus />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="password" className="text-muted-foreground text-[12.5px] font-semibold">
          รหัสผ่าน
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            className="h-12 pr-12"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-lg"
          >
            {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
          </button>
        </div>
      </div>

      {state?.error && (
        <p role="alert" className="bg-bad-soft text-destructive rounded-md px-3 py-2 text-[13px]">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="h-12 text-[15px]">
        {pending ? <Loader2 className="animate-spin" /> : <LogIn />}
        {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </Button>
    </form>
  );
}

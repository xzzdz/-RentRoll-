"use client";

import { useActionState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tenantLogin, type TenantLoginState } from "./actions";

export function TenantLoginForm() {
  const [state, action, pending] = useActionState<TenantLoginState, FormData>(tenantLogin, undefined);

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="code" className="text-muted-foreground text-[12.5px] font-semibold">
          รหัสเข้าใช้งาน
        </Label>
        {/* พิมพ์ตัวเล็กหรือมีขีดคั่นก็ได้ ฝั่งเซิร์ฟเวอร์จัดรูปให้เอง */}
        <Input
          id="code"
          name="code"
          required
          autoFocus
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="K7QX-M2P9"
          className="num h-12 text-center text-[17px] tracking-[0.2em] uppercase"
        />
        <p className="text-subtle text-xs">รหัส 8 ตัวที่ได้รับจากสำนักงานหอพักตอนทำสัญญา</p>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="phone" className="text-muted-foreground text-[12.5px] font-semibold">
          เบอร์โทรของคุณ
        </Label>
        <Input id="phone" name="phone" required inputMode="tel" autoComplete="tel" placeholder="08x-xxx-xxxx" className="num h-12" />
        <p className="text-subtle text-xs">ต้องเป็นเบอร์เดียวกับที่ให้ไว้ตอนทำสัญญา</p>
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

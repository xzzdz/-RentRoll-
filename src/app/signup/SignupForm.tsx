"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { Field } from "@/components/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signup, type SignupState } from "./actions";

export function SignupForm() {
  const [state, action, pending] = useActionState<SignupState, FormData>(signup, undefined);
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="grid gap-4">
      <Field id="propertyName" label="ชื่อหอพัก" hint="ใช้เป็นหัวใบแจ้งหนี้และใบเสร็จ · แก้ทีหลังได้">
        <Input id="propertyName" name="propertyName" required maxLength={120} placeholder="เช่น บ้านสบาย เรสซิเดนซ์" className="h-12" autoFocus />
      </Field>

      <Field id="name" label="ชื่อของคุณ">
        <Input id="name" name="name" required maxLength={60} autoComplete="name" className="h-12" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="email" label="อีเมล" hint="ใช้เข้าสู่ระบบ">
          <Input id="email" name="email" type="email" required autoComplete="email" inputMode="email" className="h-12" />
        </Field>
        <Field id="phone" label="เบอร์โทร" hint="เว้นว่างได้">
          <Input id="phone" name="phone" inputMode="tel" maxLength={20} autoComplete="tel" className="num h-12" />
        </Field>
      </div>

      <Field id="password" label="รหัสผ่าน" hint="อย่างน้อย 8 ตัวอักษร">
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
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
      </Field>

      {state?.error && (
        <p role="alert" className="bg-bad-soft text-destructive rounded-md px-3 py-2 text-[13px]">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="h-12 text-[15px]">
        {pending ? <Loader2 className="animate-spin" /> : <UserPlus />}
        {pending ? "กำลังสร้างหอ…" : "สมัครและสร้างหอ"}
      </Button>

      <p className="text-subtle text-[12px] leading-snug">
        ระบบจะตั้งค่าเริ่มต้นให้ (รอบบิล อัตราค่าน้ำ-ไฟ ประเภทห้อง ค่าบริการ) เพื่อให้เริ่มใช้ได้ทันที — แก้ได้ทุกค่าในหน้าตั้งค่า
      </p>
    </form>
  );
}

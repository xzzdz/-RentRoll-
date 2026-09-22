"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { safePath } from "@/lib/flash";
import { createSession, destroySession, homeFor } from "@/lib/auth";

export type LoginState = { error?: string } | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const id = String(formData.get("id") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!id || !password) return { error: "กรอกอีเมลหรือเบอร์โทร และรหัสผ่าน" };

  const user = await db.user.findFirst({
    where: { isActive: true, role: { in: ["OWNER", "TECHNICIAN"] }, OR: [{ email: id }, { phone: id }] },
  });
  const ok = user?.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !ok) return { error: "อีเมล/เบอร์โทร หรือรหัสผ่านไม่ถูกต้อง" };
  // บัญชีที่ยังไม่ผูกหอเข้าระบบไม่ได้ ไม่งั้นจะไม่รู้ว่าต้องแสดงข้อมูลของหอไหน
  if (!user.propertyId) return { error: "บัญชีนี้ยังไม่ได้ผูกกับหอพัก ติดต่อเจ้าของหอเพื่อเพิ่มบัญชีใหม่" };

  await createSession({ userId: user.id, role: user.role, name: user.name, propertyId: user.propertyId });
  // กัน open redirect: รับเฉพาะ path ภายใน
  redirect(safePath(next, homeFor(user.role)));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

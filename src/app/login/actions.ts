"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
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

  await createSession({ userId: user.id, role: user.role, name: user.name });
  // กัน open redirect: รับเฉพาะ path ภายใน
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : homeFor(user.role));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

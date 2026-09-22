"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth";
import { ensureTenantUser, resolveTenantByCode } from "@/lib/tenant-auth";

export type TenantLoginState = { error?: string } | undefined;

/** ล็อกอินด้วยรหัสเข้าใช้งาน + เบอร์ในสัญญา — ทางเข้าหลักสำหรับผู้เช่าที่ไม่ได้ผูก LINE */
export async function tenantLogin(_prev: TenantLoginState, f: FormData): Promise<TenantLoginState> {
  const r = await resolveTenantByCode(String(f.get("code") ?? ""), String(f.get("phone") ?? ""));
  if (!r.ok) return { error: r.error };

  const userId = await ensureTenantUser(r.tenant, r.propertyId);
  await createSession({ userId, role: "TENANT", name: r.tenant.fullName, propertyId: r.propertyId });
  redirect("/t");
}

export async function tenantLogout() {
  await destroySession();
  redirect("/t/login");
}

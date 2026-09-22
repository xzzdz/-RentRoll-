"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { normalizeInviteCode, normalizePhone } from "@/lib/invite-code";

export type TenantLoginState = { error?: string } | undefined;

/** ข้อความเดียวกันทุกกรณีที่เข้าไม่ได้ — ไม่บอกว่าผิดรหัสหรือผิดเบอร์ จะได้ไล่เดาไม่ได้ */
const DENY = { error: "รหัสเข้าใช้งานหรือเบอร์โทรไม่ถูกต้อง" };

export async function tenantLogin(_prev: TenantLoginState, f: FormData): Promise<TenantLoginState> {
  const code = normalizeInviteCode(String(f.get("code") ?? ""));
  const phone = normalizePhone(String(f.get("phone") ?? ""));
  if (!code || !phone) return { error: "กรอกรหัสเข้าใช้งานและเบอร์โทรของคุณ" };

  const tenant = await db.tenant.findUnique({
    where: { inviteCode: code },
    include: {
      user: { select: { id: true, isActive: true } },
      contracts: { include: { contract: { select: { status: true, startDate: true, room: { select: { building: { select: { propertyId: true } } } } } } } },
    },
  });
  if (!tenant) return DENY;
  // เบอร์ต้องตรงกับที่อยู่ในสัญญา — รหัสอย่างเดียวไม่พอ เผื่อรหัสหลุด
  if (normalizePhone(tenant.phone) !== phone) return DENY;

  // ต้องมีสัญญาอย่างน้อยหนึ่งฉบับ ไม่งั้นไม่รู้ว่าอยู่หอไหน
  const links = [...tenant.contracts].sort(
    (a, b) =>
      (a.contract.status === "ACTIVE" ? 0 : 1) - (b.contract.status === "ACTIVE" ? 0 : 1) ||
      b.contract.startDate.getTime() - a.contract.startDate.getTime(),
  );
  const propertyId = links[0]?.contract.room.building.propertyId;
  if (!propertyId) return { error: "รหัสนี้ยังไม่ได้ผูกกับห้องไหน ติดต่อสำนักงานหอพัก" };

  if (tenant.user && !tenant.user.isActive) return { error: "บัญชีนี้ถูกปิดใช้งาน ติดต่อสำนักงานหอพัก" };

  // ผูกบัญชีผู้ใช้ให้อัตโนมัติตอนเข้าครั้งแรก · ครั้งต่อไปใช้บัญชีเดิม
  let userId = tenant.user?.id;
  if (!userId) {
    const user = await db.user.create({ data: { role: "TENANT", name: tenant.fullName, propertyId, isActive: true } });
    await db.tenant.update({ where: { id: tenant.id }, data: { userId: user.id } });
    userId = user.id;
  } else {
    // ย้ายหอแล้วก็ยังใช้บัญชีเดิมได้ แค่ย้าย propertyId ตาม
    await db.user.update({ where: { id: userId }, data: { propertyId, name: tenant.fullName } });
  }

  await createSession({ userId, role: "TENANT", name: tenant.fullName, propertyId });
  redirect("/t");
}

export async function tenantLogout() {
  await destroySession();
  redirect("/t/login");
}

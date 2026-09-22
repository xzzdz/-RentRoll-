"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { verifyLineIdToken } from "@/lib/line";
import { ensureTenantUser, resolveTenantByCode } from "@/lib/tenant-auth";

/** needLink = LINE ตรวจผ่านแล้ว แต่บัญชีนี้ยังไม่เคยผูกกับผู้เช่าคนไหน ต้องกรอกรหัสก่อน */
export type LineLoginState = { error?: string; needLink?: boolean } | undefined;

const BAD_TOKEN = "ยืนยันตัวตนกับ LINE ไม่สำเร็จ ลองเปิดใหม่อีกครั้ง";

/**
 * เข้าสู่ระบบด้วยบัญชี LINE ที่ผูกไว้แล้ว
 * ครั้งแรกต้องผ่าน linkLineAccount ก่อน — ที่นี่แค่หาว่า LINE id นี้เป็นของผู้เช่าคนไหน
 */
export async function lineLogin(_prev: LineLoginState, f: FormData): Promise<LineLoginState> {
  const profile = await verifyLineIdToken(String(f.get("idToken") ?? ""));
  if (!profile) return { error: BAD_TOKEN };

  const user = await db.user.findUnique({
    where: { lineUserId: profile.lineUserId },
    select: { id: true, isActive: true, propertyId: true, role: true, tenantProfile: { select: { fullName: true } } },
  });

  // ยังไม่เคยผูก — ให้ไปกรอกรหัสเข้าใช้งานกับเบอร์ ไม่ใช่ error
  if (!user || user.role !== "TENANT" || !user.tenantProfile || !user.propertyId) return { needLink: true };
  if (!user.isActive) return { error: "บัญชีนี้ถูกปิดใช้งาน ติดต่อสำนักงานหอพัก" };

  await createSession({ userId: user.id, role: "TENANT", name: user.tenantProfile.fullName, propertyId: user.propertyId });
  redirect("/t");
}

/**
 * ผูกบัญชี LINE เข้ากับผู้เช่าครั้งแรก
 *
 * ยังต้องใช้รหัสเข้าใช้งาน + เบอร์ในสัญญาเหมือนเดิม เพราะ LINE บอกได้แค่ว่า
 * "คนนี้คือเจ้าของบัญชี LINE นี้" แต่บอกไม่ได้ว่าเป็นผู้เช่าห้องไหนของหอไหน
 */
export async function linkLineAccount(_prev: LineLoginState, f: FormData): Promise<LineLoginState> {
  const profile = await verifyLineIdToken(String(f.get("idToken") ?? ""));
  if (!profile) return { error: BAD_TOKEN };

  const r = await resolveTenantByCode(String(f.get("code") ?? ""), String(f.get("phone") ?? ""));
  if (!r.ok) return { error: r.error, needLink: true };

  // บัญชี LINE หนึ่งผูกได้กับผู้เช่าคนเดียว ไม่งั้นสองคนใช้ LINE เดียวกันแล้วสลับกันเห็นบิล
  const taken = await db.user.findUnique({ where: { lineUserId: profile.lineUserId }, select: { id: true } });
  if (taken && taken.id !== r.tenant.userId) {
    return { error: "บัญชี LINE นี้ผูกกับผู้เช่ารายอื่นแล้ว ติดต่อสำนักงานหอพัก", needLink: true };
  }

  const userId = await ensureTenantUser(r.tenant, r.propertyId, profile.lineUserId);
  await createSession({ userId, role: "TENANT", name: r.tenant.fullName, propertyId: r.propertyId });
  redirect("/t");
}

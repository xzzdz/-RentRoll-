import { randomBytes } from "node:crypto";
import type { InvoiceStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { db } from "./db";
import { requireRole } from "./auth";
import { INVITE_ALPHABET, INVITE_LENGTH, normalizeInviteCode, normalizePhone } from "./invite-code";

/**
 * รหัสเข้าเว็บของผู้เช่า
 *
 * ทำไมใช้รหัสแทน OTP: ส่ง SMS มีค่าใช้จ่ายต่อข้อความ และผูก LINE ก็ยังทำไม่ได้
 * เจ้าของออกรหัสให้ตอนทำสัญญา แล้วส่งให้ผู้เช่าครั้งเดียว
 *
 * รหัสอย่างเดียวไม่พอ ต้องกรอกเบอร์ที่ตรงกับในสัญญาด้วย
 * เผื่อรหัสหลุดไปอยู่ในมือคนอื่น จะได้ไม่เปิดดูบิลของคนอื่นได้
 */

export function newInviteCode(length = INVITE_LENGTH) {
  let out = "";
  while (out.length < length) {
    // สุ่มแบบตัดค่าที่เกินรอบทิ้ง จะได้ไม่เอนไปทางตัวอักษรต้น ๆ
    for (const b of randomBytes(length * 2)) {
      if (b >= 256 - (256 % INVITE_ALPHABET.length)) continue;
      out += INVITE_ALPHABET[b % INVITE_ALPHABET.length];
      if (out.length === length) break;
    }
  }
  return out;
}

/**
 * ข้อมูลผู้เช่าที่ล็อกอินอยู่ พร้อมสัญญาล่าสุด
 * สัญญาที่ยังใช้งานมาก่อน ถ้าไม่มี (ย้ายออกแล้ว) ให้เอาฉบับล่าสุดมาแทน
 * จะได้ยังเปิดดูบิลเก่ากับใบเสร็จย้อนหลังได้
 */
export async function currentTenant() {
  const s = await requireRole("TENANT");

  const tenant = await db.tenant.findFirst({
    where: { userId: s.userId },
    include: {
      contracts: {
        include: {
          contract: {
            include: { room: { include: { roomType: true, building: { select: { id: true, name: true, propertyId: true } } } } },
          },
        },
      },
    },
  });
  if (!tenant) redirect("/t/login");

  const links = [...tenant.contracts].sort((a, b) => {
    const rank = (x: typeof a) => (x.contract.status === "ACTIVE" ? 0 : 1);
    return rank(a) - rank(b) || b.contract.startDate.getTime() - a.contract.startDate.getTime();
  });
  const link = links[0];
  if (!link) redirect("/t/login");

  const contract = link.contract;
  return {
    tenantId: tenant.id,
    name: tenant.fullName,
    phone: tenant.phone,
    isPrimary: link.isPrimary,
    contract,
    room: contract.room,
    building: contract.room.building,
    propertyId: contract.room.building.propertyId,
    isActive: contract.status === "ACTIVE",
  };
}

/** บิลร่างเป็นกระดาษทดของเจ้าของ ผู้เช่าต้องไม่เห็นจนกว่าจะกดส่งบิล (และบิลที่ยกเลิกก็ไม่ต้องโชว์) */
export const TENANT_INVOICE: InvoiceStatus[] = ["ISSUED", "PARTIAL", "PAID", "OVERDUE"];

export type TenantContext = Awaited<ReturnType<typeof currentTenant>>;

/** ข้อความเดียวกันทุกกรณีที่เข้าไม่ได้ — ไม่บอกว่าผิดรหัสหรือผิดเบอร์ จะได้ไล่เดาไม่ได้ */
export const TENANT_DENY = "รหัสเข้าใช้งานหรือเบอร์โทรไม่ถูกต้อง";

export type TenantResolve = { ok: true; tenant: ResolvedTenant; propertyId: string } | { ok: false; error: string };

type ResolvedTenant = { id: string; fullName: string; userId: string | null };

/**
 * หาผู้เช่าจาก "รหัสเข้าใช้งาน + เบอร์ในสัญญา"
 * ใช้ร่วมกันทั้งตอนล็อกอินด้วยรหัส และตอนผูกบัญชี LINE ครั้งแรก
 * ทั้งสองทางต้องผ่านด่านเดียวกัน ไม่งั้นทางหนึ่งหลวมกว่าอีกทางโดยไม่มีใครรู้
 */
export async function resolveTenantByCode(rawCode: string, rawPhone: string): Promise<TenantResolve> {
  const code = normalizeInviteCode(rawCode);
  const phone = normalizePhone(rawPhone);
  if (!code || !phone) return { ok: false, error: "กรอกรหัสเข้าใช้งานและเบอร์โทรของคุณ" };

  const tenant = await db.tenant.findUnique({
    where: { inviteCode: code },
    include: {
      user: { select: { id: true, isActive: true } },
      contracts: {
        include: { contract: { select: { status: true, startDate: true, room: { select: { building: { select: { propertyId: true } } } } } } },
      },
    },
  });
  if (!tenant) return { ok: false, error: TENANT_DENY };
  // รหัสอย่างเดียวไม่พอ ต้องคู่กับเบอร์ที่อยู่ในสัญญา เผื่อรหัสหลุดไปอยู่ในมือคนอื่น
  if (normalizePhone(tenant.phone) !== phone) return { ok: false, error: TENANT_DENY };

  const links = [...tenant.contracts].sort(
    (a, b) =>
      (a.contract.status === "ACTIVE" ? 0 : 1) - (b.contract.status === "ACTIVE" ? 0 : 1) ||
      b.contract.startDate.getTime() - a.contract.startDate.getTime(),
  );
  const propertyId = links[0]?.contract.room.building.propertyId;
  if (!propertyId) return { ok: false, error: "รหัสนี้ยังไม่ได้ผูกกับห้องไหน ติดต่อสำนักงานหอพัก" };
  if (tenant.user && !tenant.user.isActive) return { ok: false, error: "บัญชีนี้ถูกปิดใช้งาน ติดต่อสำนักงานหอพัก" };

  return { ok: true, tenant: { id: tenant.id, fullName: tenant.fullName, userId: tenant.user?.id ?? null }, propertyId };
}

/**
 * สร้างบัญชีผู้ใช้ของผู้เช่าถ้ายังไม่มี แล้วคืน userId
 * ส่ง lineUserId มาด้วยตอนผูก LINE ครั้งแรก · ย้ายหอแล้วก็ใช้บัญชีเดิม แค่ย้าย propertyId ตาม
 */
export async function ensureTenantUser(tenant: ResolvedTenant, propertyId: string, lineUserId?: string) {
  if (!tenant.userId) {
    const user = await db.user.create({
      data: { role: "TENANT", name: tenant.fullName, propertyId, isActive: true, ...(lineUserId ? { lineUserId } : {}) },
    });
    await db.tenant.update({ where: { id: tenant.id }, data: { userId: user.id } });
    return user.id;
  }
  await db.user.update({
    where: { id: tenant.userId },
    data: { propertyId, name: tenant.fullName, ...(lineUserId ? { lineUserId } : {}) },
  });
  return tenant.userId;
}

import { randomBytes } from "node:crypto";
import type { InvoiceStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { db } from "./db";
import { requireRole } from "./auth";
import { INVITE_ALPHABET, INVITE_LENGTH } from "./invite-code";

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

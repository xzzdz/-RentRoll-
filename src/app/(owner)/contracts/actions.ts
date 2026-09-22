"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { assertRoomInScope } from "@/lib/scope";
import { encrypt } from "@/lib/crypto";
import { nextDocNo } from "@/lib/docno";
import { periodOf } from "@/lib/period";
import { withFlash } from "@/lib/flash";

export type ContractFormState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => {
  const s = str(f, k);
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};
/** "2026-09-11" → Date (UTC เที่ยงคืน ตรงกับ @db.Date) */
const date = (f: FormData, k: string) => {
  const s = str(f, k);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00Z`) : null;
};

export async function createContract(_prev: ContractFormState, f: FormData): Promise<ContractFormState> {
  const session = await requireRole("OWNER");

  const roomId = str(f, "roomId");
  if (roomId) await assertRoomInScope(roomId);
  const fullName = str(f, "fullName");
  const phone = str(f, "phone");
  const idCardNo = str(f, "idCardNo").replace(/\D/g, "");
  const startDate = date(f, "startDate");
  const endDate = date(f, "endDate");
  const monthlyRent = num(f, "monthlyRent");
  const depositAmount = num(f, "depositAmount");
  const waterInitial = num(f, "waterInitial");
  const electricInitial = num(f, "electricInitial");

  const fe: Record<string, string> = {};
  if (!roomId) fe.roomId = "เลือกห้อง";
  if (!fullName) fe.fullName = "กรอกชื่อผู้เช่า";
  if (!/^0\d{8,9}$/.test(phone.replace(/\D/g, ""))) fe.phone = "เบอร์โทรไม่ถูกต้อง";
  if (idCardNo && idCardNo.length !== 13) fe.idCardNo = "เลขบัตรประชาชนต้องมี 13 หลัก";
  if (!startDate) fe.startDate = "เลือกวันเริ่มสัญญา";
  if (endDate && startDate && endDate <= startDate) fe.endDate = "วันสิ้นสุดต้องหลังวันเริ่ม";
  if (monthlyRent == null || Number.isNaN(monthlyRent)) fe.monthlyRent = "กรอกค่าเช่า";
  if (depositAmount == null || Number.isNaN(depositAmount)) fe.depositAmount = "กรอกเงินประกัน";
  if (Object.keys(fe).length) return { error: "ข้อมูลไม่ครบหรือไม่ถูกต้อง", fieldErrors: fe };

  const room = await db.room.findUnique({
    where: { id: roomId },
    include: { meters: { where: { isActive: true } }, contracts: { where: { status: "ACTIVE" } }, building: true },
  });
  if (!room) return { error: "ไม่พบห้อง" };
  if (room.contracts.length) return { error: `ห้อง ${room.number} มีสัญญาที่ใช้งานอยู่แล้ว` };

  const water = room.meters.find((m) => m.utility === "WATER");
  const electric = room.meters.find((m) => m.utility === "ELECTRIC");
  if (water && (waterInitial == null || Number.isNaN(waterInitial))) fe.waterInitial = "จดเลขมิเตอร์น้ำตั้งต้น";
  if (electric && (electricInitial == null || Number.isNaN(electricInitial))) fe.electricInitial = "จดเลขมิเตอร์ไฟตั้งต้น";
  if (Object.keys(fe).length) return { error: "ต้องจดเลขมิเตอร์ตั้งต้นก่อนเข้าอยู่", fieldErrors: fe };

  // ค่าบริการที่ติ๊ก (fee_<id> = on) และราคาที่แก้ (fee_<id>_amount)
  const feeItems = await db.feeItem.findMany({ where: { propertyId: room.building.propertyId, isActive: true } });
  const fees = feeItems
    .filter((i) => f.get(`fee_${i.id}`) === "on")
    .map((i) => {
      const a = num(f, `fee_${i.id}_amount`);
      return { feeItemId: i.id, amount: a != null && !Number.isNaN(a) && a !== i.amount.toNumber() ? a : null };
    });

  const period = periodOf(startDate!);
  const contract = await db.$transaction(async (tx) => {
    const contractNo = await nextDocNo(tx, room.building.propertyId, "CONTRACT", startDate!);
    const tenant = await tx.tenant.create({
      data: {
        fullName,
        phone: phone.replace(/\D/g, ""),
        idCardNo: idCardNo ? encrypt(idCardNo) : null,
        address: str(f, "address") || null,
        emergencyName: str(f, "emergencyName") || null,
        emergencyPhone: str(f, "emergencyPhone") || null,
        inviteCode: crypto.randomUUID().slice(0, 8).toUpperCase(),
      },
    });
    const c = await tx.contract.create({
      data: {
        contractNo,
        roomId: room.id,
        status: "ACTIVE",
        startDate: startDate!,
        endDate,
        monthlyRent: monthlyRent!,
        depositAmount: depositAmount!,
        note: str(f, "note") || null,
        tenants: { create: { tenantId: tenant.id, isPrimary: true } },
        fees: { create: fees },
      },
    });
    // เลขมิเตอร์ตั้งต้น = เลขครั้งก่อนของบิลรอบแรก
    for (const [m, value] of [
      [water, waterInitial],
      [electric, electricInitial],
    ] as const) {
      if (!m || value == null) continue;
      await tx.meterReading.upsert({
        where: { meterId_periodMonth_isInitial: { meterId: m.id, periodMonth: period, isInitial: true } },
        create: { meterId: m.id, periodMonth: period, value, isInitial: true, readById: session.userId, readAt: startDate! },
        update: { value, readById: session.userId, editedAt: new Date() },
      });
    }
    await tx.room.update({ where: { id: room.id }, data: { status: "OCCUPIED" } });
    await tx.auditLog.create({
      data: { userId: session.userId, entity: "Contract", entityId: c.id, action: "CREATE", after: { contractNo, roomId: room.id, tenant: fullName } },
    });
    return c;
  });

  revalidatePath("/rooms");
  redirect(withFlash(`/rooms/${room.id}`, "ok", `ทำสัญญา ${contract.contractNo} แล้ว`));
}

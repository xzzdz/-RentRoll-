"use server";

import type { RoomStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { currentPropertyId, requireRole } from "@/lib/auth";
import { periodOf } from "@/lib/period";
import { thPeriod } from "@/lib/format";
import { safePath, withFlash } from "@/lib/flash";
import { assertContractInScope, assertRoomInScope } from "@/lib/scope";
import { newInviteCode } from "@/lib/tenant-auth";
import { normalizePhone } from "@/lib/invite-code";
import { encrypt } from "@/lib/crypto";

export type MoveOutState = { error?: string } | undefined;

export async function moveOut(_prev: MoveOutState, f: FormData): Promise<MoveOutState> {
  const session = await requireRole("OWNER");
  const contractId = String(f.get("contractId") ?? "");
  await assertContractInScope(contractId);
  const d = String(f.get("moveOutDate") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return { error: "เลือกวันย้ายออก" };
  const moveOutDate = new Date(`${d}T00:00:00Z`);

  const contract = await db.contract.findUnique({
    where: { id: contractId },
    include: { room: { include: { meters: { where: { isActive: true } } } } },
  });
  if (!contract || contract.status !== "ACTIVE") return { error: "ไม่พบสัญญาที่ใช้งาน" };
  if (moveOutDate < contract.startDate) return { error: "วันย้ายออกต้องไม่ก่อนวันเริ่มสัญญา" };

  const readings: { meterId: string; value: number }[] = [];
  for (const m of contract.room.meters) {
    const key = m.utility === "WATER" ? "waterFinal" : "electricFinal";
    const raw = String(f.get(key) ?? "").trim();
    const value = Number(raw);
    if (raw === "" || !Number.isFinite(value) || value < 0) return { error: `จดเลขมิเตอร์${m.utility === "WATER" ? "น้ำ" : "ไฟ"}วันย้ายออก` };
    readings.push({ meterId: m.id, value });
  }
  const refundRaw = String(f.get("depositRefund") ?? "").trim();
  const depositRefund = refundRaw === "" ? null : Number(refundRaw);
  if (depositRefund != null && (!Number.isFinite(depositRefund) || depositRefund < 0)) return { error: "ยอดคืนเงินประกันไม่ถูกต้อง" };

  const period = periodOf(moveOutDate);
  await db.$transaction(async (tx) => {
    // เลขวันย้ายออก = เลขรายเดือนของรอบนั้น → ใช้ออกบิลสุดท้าย
    for (const r of readings) {
      await tx.meterReading.upsert({
        where: { meterId_periodMonth_isInitial: { meterId: r.meterId, periodMonth: period, isInitial: false } },
        create: { meterId: r.meterId, periodMonth: period, value: r.value, readById: session.userId, readAt: moveOutDate, note: "ย้ายออก" },
        update: { value: r.value, editedAt: new Date(), note: "ย้ายออก" },
      });
    }
    await tx.contract.update({
      where: { id: contract.id },
      data: { status: "ENDED", moveOutDate, depositRefund, note: String(f.get("note") ?? "").trim() || contract.note },
    });
    await tx.room.update({ where: { id: contract.roomId }, data: { status: "VACANT" } });
    await tx.auditLog.create({
      data: { userId: session.userId, entity: "Contract", entityId: contract.id, action: "UPDATE", after: { status: "ENDED", moveOutDate: d, depositRefund } },
    });
  });

  revalidatePath("/rooms");
  redirect(withFlash(`/rooms/${contract.roomId}`, "ok", `บันทึกย้ายออกแล้ว — ออกบิลสุดท้ายได้ที่หน้าบิล รอบ ${thPeriod(period)}`));
}

const ALLOWED: RoomStatus[] = ["VACANT", "RESERVED", "MAINTENANCE"];

export async function setRoomStatus(f: FormData) {
  const session = await requireRole("OWNER");
  const roomId = String(f.get("roomId") ?? "");
  await assertRoomInScope(roomId);
  const status = String(f.get("status") ?? "") as RoomStatus;
  const room = await db.room.findUnique({ where: { id: roomId }, include: { contracts: { where: { status: "ACTIVE" } } } });
  if (!room) redirect(withFlash("/rooms", "err", "ไม่พบห้อง"));
  if (room.contracts.length || !ALLOWED.includes(status)) redirect(withFlash(`/rooms/${roomId}`, "err", "เปลี่ยนสถานะไม่ได้ (ห้องมีผู้เช่า)"));

  await db.room.update({ where: { id: roomId }, data: { status } });
  await db.auditLog.create({ data: { userId: session.userId, entity: "Room", entityId: roomId, action: "UPDATE", before: { status: room.status }, after: { status } } });
  revalidatePath("/rooms");
  redirect(withFlash(`/rooms/${roomId}`, "ok", "เปลี่ยนสถานะห้องแล้ว"));
}

/**
 * ออกรหัสให้ผู้เช่าเข้าเว็บฝั่งผู้เช่า (ออกใหม่ทับของเดิมได้)
 * ออกใหม่ = รหัสเก่าใช้ไม่ได้ทันที ใช้ตอนผู้เช่าทำรหัสหาย
 */
export async function issueTenantCode(f: FormData) {
  const propertyId = await currentPropertyId();
  const tenantId = String(f.get("tenantId") ?? "");
  const back = safePath(f.get("back"), "/tenants");

  // ผู้เช่าคนนี้ต้องมีสัญญาอยู่ในหอของผู้ใช้จริง ไม่งั้นยิง id ของหออื่นมาออกรหัสได้
  const tenant = await db.tenant.findFirst({
    where: { id: tenantId, contracts: { some: { contract: { room: { building: { propertyId } } } } } },
    select: { id: true, fullName: true },
  });
  if (!tenant) redirect(withFlash(back, "err", "ไม่พบผู้เช่ารายนี้ในหอของคุณ"));

  // รหัสไม่ซ้ำทั้งระบบ — ชนกันได้ยากมาก แต่ลองใหม่ไว้ก่อนดีกว่าให้ error หลุดไปหาผู้ใช้
  let code = newInviteCode();
  for (let i = 0; i < 5 && (await db.tenant.findUnique({ where: { inviteCode: code }, select: { id: true } })); i++) {
    code = newInviteCode();
  }

  await db.tenant.update({ where: { id: tenant.id }, data: { inviteCode: code } });
  revalidatePath(back);
  redirect(withFlash(back, "ok", `ออกรหัสใหม่ให้ ${tenant.fullName} แล้ว — รหัสเดิมใช้ไม่ได้อีก`));
}

/**
 * แก้ข้อมูลห้อง — ประเภทห้อง ราคาพิเศษ และหมายเหตุ
 * แก้ได้แม้ห้องมีผู้เช่า เพราะสัญญาเก็บ monthlyRent เป็น snapshot ตั้งแต่วันทำสัญญา
 * ของใหม่จึงมีผลกับสัญญาฉบับถัดไปเท่านั้น ไม่ย้อนไปแก้บิลหรือสัญญาที่ออกไปแล้ว
 */
export async function updateRoom(f: FormData) {
  const session = await requireRole("OWNER");
  const roomId = String(f.get("roomId") ?? "");
  const { propertyId } = await assertRoomInScope(roomId);
  const back = `/rooms/${roomId}`;

  // ประเภทห้องต้องเป็นของหอเดียวกัน ไม่งั้นยิง id ของหออื่นมาผูกกับห้องเราได้
  const roomTypeId = String(f.get("roomTypeId") ?? "").trim();
  const roomType = await db.roomType.findFirst({ where: { id: roomTypeId, propertyId }, select: { id: true, name: true } });
  if (!roomType) redirect(withFlash(back, "err", "เลือกประเภทห้อง"));

  // เว้นว่าง = ใช้ค่าเช่าตั้งต้นของประเภทห้อง ไม่ใช่ราคาศูนย์บาท
  const rentRaw = String(f.get("rentOverride") ?? "").trim();
  const rentOverride = rentRaw === "" ? null : Number(rentRaw);
  if (rentOverride != null && (!Number.isFinite(rentOverride) || rentOverride < 0)) {
    redirect(withFlash(back, "err", "ราคาพิเศษต้องเป็นตัวเลขไม่ติดลบ"));
  }

  const note = String(f.get("note") ?? "").trim() || null;
  const before = await db.room.findUniqueOrThrow({ where: { id: roomId }, select: { roomTypeId: true, rentOverride: true, note: true } });

  await db.room.update({ where: { id: roomId }, data: { roomTypeId, rentOverride, note } });
  await db.auditLog.create({
    data: {
      userId: session.userId,
      entity: "Room",
      entityId: roomId,
      action: "UPDATE",
      // Decimal ลง Json ตรง ๆ ไม่ได้ ต้องแปลงเป็นตัวเลขก่อน
      before: { roomTypeId: before.roomTypeId, rentOverride: before.rentOverride?.toNumber() ?? null, note: before.note },
      after: { roomTypeId, rentOverride, note },
    },
  });

  revalidatePath("/rooms");
  revalidatePath(back);
  redirect(withFlash(back, "ok", `บันทึกแล้ว — ห้องนี้เป็น "${roomType.name}"`));
}

/**
 * แก้ข้อมูลผู้เช่า — ชื่อ เบอร์ เลขบัตร ที่อยู่ ผู้ติดต่อฉุกเฉิน
 * เบอร์โทรสำคัญเป็นพิเศษ เพราะผู้เช่าใช้ "เบอร์ + รหัสเข้าใช้งาน" ล็อกอิน
 * คีย์เบอร์ผิดตอนทำสัญญาแล้วแก้ไม่ได้ = ผู้เช่าคนนั้นเข้าเว็บไม่ได้ตลอดไป
 */
export async function updateTenant(f: FormData) {
  const session = await requireRole("OWNER");
  const propertyId = await currentPropertyId();
  const tenantId = String(f.get("tenantId") ?? "");
  const back = safePath(f.get("back"), "/tenants");

  // ผู้เช่าคนนี้ต้องมีสัญญาอยู่ในหอของผู้ใช้จริง ไม่งั้นยิง id ของหออื่นมาแก้ได้
  const tenant = await db.tenant.findFirst({
    where: { id: tenantId, contracts: { some: { contract: { room: { building: { propertyId } } } } } },
    select: { id: true, fullName: true, phone: true },
  });
  if (!tenant) redirect(withFlash(back, "err", "ไม่พบผู้เช่ารายนี้ในหอของคุณ"));

  const fullName = String(f.get("fullName") ?? "").trim();
  const phone = normalizePhone(String(f.get("phone") ?? ""));
  if (!fullName) redirect(withFlash(back, "err", "กรอกชื่อผู้เช่า"));
  if (!/^0\d{8,9}$/.test(phone)) redirect(withFlash(back, "err", "เบอร์โทรไม่ถูกต้อง"));

  // เบอร์ซ้ำกับผู้เช่าคนอื่นในหอเดียวกันไม่ได้ เพราะใช้คู่กับรหัสตอนล็อกอิน
  const clash = await db.tenant.findFirst({
    where: { id: { not: tenantId }, phone, contracts: { some: { contract: { room: { building: { propertyId } } } } } },
    select: { fullName: true },
  });
  if (clash) redirect(withFlash(back, "err", `เบอร์นี้ใช้กับ ${clash.fullName} อยู่แล้ว`));

  // เว้นว่าง = ไม่เปลี่ยนเลขบัตรเดิม เพราะหน้าจอแสดงแค่ 4 ตัวท้าย พิมพ์ซ้ำทั้งหมดไม่ไหว
  const idRaw = String(f.get("idCardNo") ?? "").replace(/\D/g, "");
  if (idRaw && idRaw.length !== 13) redirect(withFlash(back, "err", "เลขบัตรประชาชนต้องมี 13 หลัก"));

  const data = {
    fullName,
    phone,
    address: String(f.get("address") ?? "").trim() || null,
    emergencyName: String(f.get("emergencyName") ?? "").trim() || null,
    emergencyPhone: normalizePhone(String(f.get("emergencyPhone") ?? "")) || null,
    ...(idRaw ? { idCardNo: encrypt(idRaw) } : {}),
  };

  await db.tenant.update({ where: { id: tenantId }, data });
  await db.auditLog.create({
    data: {
      userId: session.userId,
      entity: "Tenant",
      entityId: tenantId,
      action: "UPDATE",
      // ห้ามบันทึกเลขบัตรลง audit log แค่บอกว่าถูกเปลี่ยนก็พอ
      before: { fullName: tenant.fullName, phone: tenant.phone },
      after: { fullName, phone, idCardChanged: !!idRaw },
    },
  });

  revalidatePath(back);
  revalidatePath("/tenants");
  redirect(withFlash(back, "ok", `บันทึกข้อมูลของ ${fullName} แล้ว`));
}

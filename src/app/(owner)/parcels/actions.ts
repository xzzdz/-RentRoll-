"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentPropertyId, requireRole } from "@/lib/auth";
import { withFlash } from "@/lib/flash";
import { ScopeError } from "@/lib/scope";

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const BACK = "/parcels";

/** ตรวจว่าพัสดุชิ้นนี้อยู่ในหอของผู้ใช้จริง — ฟอร์มส่ง id อะไรมาก็ได้ */
async function assertParcelInScope(id: string) {
  const propertyId = await currentPropertyId();
  const parcel = await db.parcel.findFirst({ where: { id, propertyId }, select: { id: true, status: true, recipient: true } });
  if (!parcel) throw new ScopeError("พัสดุ");
  return parcel;
}

/**
 * รับพัสดุเข้า — ระบุห้องด้วย "เลขห้อง" ไม่ใช่ id
 * เพราะคนหน้าเคาน์เตอร์อ่านเลขห้องจากหน้ากล่อง ไม่ได้เลือกจากรายการ
 */
export async function logParcel(f: FormData) {
  const s = await requireRole("OWNER");
  const propertyId = s.propertyId;

  const roomNumber = text(f, "room");
  let roomId: string | null = null;
  let tenantId: string | null = null;
  let tenantName: string | null = null;

  if (roomNumber) {
    const room = await db.room.findFirst({
      where: { number: roomNumber, building: { propertyId } },
      select: {
        id: true,
        contracts: { where: { status: "ACTIVE" }, take: 1, include: { tenants: { where: { isPrimary: true }, include: { tenant: true } } } },
      },
    });
    if (!room) redirect(withFlash(BACK, "err", `ไม่พบห้อง ${roomNumber} ในหอนี้`));
    roomId = room.id;
    const primary = room.contracts[0]?.tenants[0]?.tenant;
    tenantId = primary?.id ?? null;
    tenantName = primary?.fullName ?? null;
  }

  // ชื่อหน้ากล่องว่าง ให้ใช้ชื่อผู้เช่าปัจจุบันของห้องแทน ไม่งั้นค้นตอนมารับไม่เจอ
  const recipient = text(f, "recipient") || tenantName || "";
  if (!recipient) redirect(withFlash(BACK, "err", "ระบุห้องหรือชื่อผู้รับอย่างน้อยหนึ่งอย่าง"));

  await db.parcel.create({
    data: {
      propertyId,
      roomId,
      tenantId,
      recipient,
      carrier: text(f, "carrier") || null,
      trackingNo: text(f, "trackingNo") || null,
      size: text(f, "size") || null,
      note: text(f, "note") || null,
      receivedById: s.userId,
    },
  });

  revalidatePath(BACK);
  revalidatePath("/dashboard");
  redirect(withFlash(BACK, "ok", `รับพัสดุของ ${recipient} เข้าระบบแล้ว`));
}

/** จ่ายของให้คนมารับ — เก็บชื่อคนที่มารับไว้ด้วย เพราะบ่อยครั้งไม่ใช่ผู้เช่าเอง */
export async function handOverParcel(f: FormData) {
  const s = await requireRole("OWNER");
  const id = text(f, "id");
  const parcel = await assertParcelInScope(id);
  if (parcel.status !== "WAITING") redirect(withFlash(BACK, "err", "พัสดุชิ้นนี้จ่ายออกไปแล้ว"));

  await db.parcel.update({
    where: { id },
    data: {
      status: "PICKED_UP",
      pickedUpAt: new Date(),
      collectedBy: text(f, "collectedBy") || parcel.recipient,
      handedOverById: s.userId,
    },
  });

  revalidatePath(BACK);
  revalidatePath("/dashboard");
  redirect(withFlash(BACK, "ok", "จ่ายพัสดุแล้ว"));
}

/** ตีกลับผู้ส่ง — ใช้กับของที่ไม่มีคนมารับ หรือผู้เช่าย้ายออกไปแล้ว */
export async function returnParcel(f: FormData) {
  await requireRole("OWNER");
  const id = text(f, "id");
  const parcel = await assertParcelInScope(id);
  if (parcel.status !== "WAITING") redirect(withFlash(BACK, "err", "พัสดุชิ้นนี้ปิดไปแล้ว"));

  await db.parcel.update({ where: { id }, data: { status: "RETURNED", pickedUpAt: new Date() } });
  revalidatePath(BACK);
  revalidatePath("/dashboard");
  redirect(withFlash(BACK, "ok", "บันทึกว่าตีกลับผู้ส่งแล้ว"));
}

/** ลบทิ้ง — ไว้แก้ตอนบันทึกผิด ไม่ใช่ขั้นตอนปกติ */
export async function deleteParcel(f: FormData) {
  await requireRole("OWNER");
  const id = text(f, "id");
  await assertParcelInScope(id);
  await db.parcel.delete({ where: { id } });
  revalidatePath(BACK);
  revalidatePath("/dashboard");
  redirect(withFlash(BACK, "ok", "ลบรายการพัสดุแล้ว"));
}

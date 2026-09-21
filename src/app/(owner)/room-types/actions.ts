"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withFlash } from "@/lib/flash";

const BACK = "/room-types";
const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const amount = (f: FormData, k: string) => {
  const n = Number(String(f.get(k) ?? "").trim());
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export async function createRoomType(f: FormData) {
  await requireRole("OWNER");
  const property = await db.property.findFirstOrThrow({ select: { id: true } });
  const name = text(f, "name");
  const baseRent = amount(f, "baseRent");
  const deposit = amount(f, "deposit");
  if (!name || baseRent == null || deposit == null) redirect(withFlash(BACK, "err", "ใส่ชื่อ ค่าเช่า และเงินประกัน"));
  if (await db.roomType.findFirst({ where: { propertyId: property.id, name } })) redirect(withFlash(BACK, "err", `มีประเภท "${name}" อยู่แล้ว`));

  await db.roomType.create({ data: { propertyId: property.id, name, baseRent, deposit, description: text(f, "description") || null } });
  revalidatePath(BACK);
  redirect(withFlash(BACK, "ok", `เพิ่มประเภท "${name}" แล้ว`));
}

export async function updateRoomType(f: FormData) {
  await requireRole("OWNER");
  const id = text(f, "id");
  const rt = await db.roomType.findUnique({ where: { id } });
  if (!rt) redirect(withFlash(BACK, "err", "ไม่พบประเภทห้อง"));

  await db.roomType.update({
    where: { id },
    data: {
      name: text(f, "name") || rt.name,
      baseRent: amount(f, "baseRent") ?? rt.baseRent,
      deposit: amount(f, "deposit") ?? rt.deposit,
      description: text(f, "description") || null,
    },
  });
  revalidatePath(BACK);
  revalidatePath("/rooms");
  // ค่าเช่าที่แก้มีผลกับสัญญาใหม่เท่านั้น สัญญาเดิมเก็บค่าเช่าของตัวเองไว้แล้ว
  redirect(withFlash(BACK, "ok", "บันทึกแล้ว — มีผลกับสัญญาที่ทำหลังจากนี้"));
}

export async function deleteRoomType(f: FormData) {
  await requireRole("OWNER");
  const id = text(f, "id");
  const rooms = await db.room.count({ where: { roomTypeId: id } });
  if (rooms > 0) redirect(withFlash(BACK, "err", `ลบไม่ได้ — มี ${rooms} ห้องใช้ประเภทนี้อยู่`));

  await db.roomType.delete({ where: { id } });
  revalidatePath(BACK);
  redirect(withFlash(BACK, "ok", "ลบประเภทห้องแล้ว"));
}

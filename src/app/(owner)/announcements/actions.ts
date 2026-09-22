"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, currentPropertyId } from "@/lib/auth";
import { withFlash } from "@/lib/flash";
import { assertOwnRow } from "@/lib/scope";

const BACK = "/announcements";
const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const dateOrNull = (s: string) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00Z`) : null);

function parse(f: FormData) {
  const title = text(f, "title");
  const body = text(f, "body");
  if (!title) return { error: "ใส่หัวข้อประกาศ" };
  if (!body) return { error: "ใส่เนื้อหาประกาศ" };
  return {
    data: {
      title,
      body,
      buildingId: text(f, "buildingId") || null,
      pinned: f.get("pinned") === "on",
      expiresAt: dateOrNull(text(f, "expiresAt")),
    },
  };
}

export async function createAnnouncement(f: FormData) {
  const session = await requireRole("OWNER");
  const propertyId = await currentPropertyId();
  const r = parse(f);
  if (r.error) redirect(withFlash(BACK, "err", r.error));

  // ปุ่ม "ประกาศเลย" ตั้งเวลาเผยแพร่ทันที ส่วน "เก็บเป็นร่าง" ปล่อยว่างไว้
  const publishNow = f.get("publish") === "1";
  await db.announcement.create({
    data: { ...r.data!, propertyId: propertyId, createdById: session.userId, publishedAt: publishNow ? new Date() : null },
  });
  revalidatePath(BACK);
  redirect(withFlash(BACK, "ok", publishNow ? "ประกาศแล้ว" : "เก็บเป็นฉบับร่างแล้ว"));
}

export async function updateAnnouncement(f: FormData) {
  const id = text(f, "id");
  await assertOwnRow("announcement", id, "ประกาศ");
  const r = parse(f);
  if (r.error) redirect(withFlash(BACK, "err", r.error));

  await db.announcement.update({ where: { id }, data: r.data! });
  revalidatePath(BACK);
  redirect(withFlash(BACK, "ok", "บันทึกประกาศแล้ว"));
}

/** สลับระหว่างประกาศกับเก็บกลับเป็นร่าง */
export async function togglePublish(f: FormData) {
  const id = text(f, "id");
  await assertOwnRow("announcement", id, "ประกาศ");
  const a = await db.announcement.findUnique({ where: { id } });
  if (!a) redirect(withFlash(BACK, "err", "ไม่พบประกาศ"));

  const publishing = a.publishedAt == null;
  await db.announcement.update({ where: { id }, data: { publishedAt: publishing ? new Date() : null } });
  revalidatePath(BACK);
  redirect(withFlash(BACK, "ok", publishing ? "ประกาศขึ้นบอร์ดแล้ว" : "เก็บกลับเป็นฉบับร่างแล้ว"));
}

export async function deleteAnnouncement(f: FormData) {
  const id = text(f, "id");
  await assertOwnRow("announcement", id, "ประกาศ");
  await db.announcement.delete({ where: { id } });
  revalidatePath(BACK);
  redirect(withFlash(BACK, "ok", "ลบประกาศแล้ว"));
}

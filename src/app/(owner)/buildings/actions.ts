"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, currentPropertyId } from "@/lib/auth";
import { withFlash } from "@/lib/flash";
import { MAX_CELLS, MAX_COLS, MIN_COLS, parsePlan } from "@/lib/floorplan";
import { assertBuildingInScope, assertRoomInScope } from "@/lib/scope";

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string, fallback: number) => {
  const n = Math.round(Number(f.get(k)));
  return Number.isFinite(n) ? n : fallback;
};

async function propertyId() {
  return currentPropertyId();
}

// ---------------------------------------------------------------
//  ตึก
// ---------------------------------------------------------------
export async function createBuilding(f: FormData) {
  await requireRole("OWNER");
  const pid = await propertyId();
  const name = text(f, "name");
  const floors = int(f, "floors", 1);
  if (!name) redirect(withFlash("/buildings", "err", "ใส่ชื่อตึก"));
  if (floors < 1 || floors > 60) redirect(withFlash("/buildings", "err", "จำนวนชั้นต้องอยู่ระหว่าง 1–60"));
  if (await db.building.findFirst({ where: { propertyId: pid, name } })) redirect(withFlash("/buildings", "err", `มีตึกชื่อ "${name}" อยู่แล้ว`));

  const last = await db.building.findFirst({ where: { propertyId: pid }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  const b = await db.building.create({
    data: { propertyId: pid, name, code: text(f, "code") || null, floors, sortOrder: (last?.sortOrder ?? -1) + 1 },
  });
  revalidatePath("/buildings");
  revalidatePath("/rooms");
  redirect(withFlash(`/buildings/${b.id}`, "ok", `เพิ่ม ${name} แล้ว — สร้างห้องต่อได้เลย`));
}

export async function updateBuilding(f: FormData) {
  await requireRole("OWNER");
  const id = text(f, "id");
  const name = text(f, "name");
  const floors = int(f, "floors", 1);
  if (!name) redirect(withFlash(`/buildings/${id}`, "err", "ใส่ชื่อตึก"));

  await assertBuildingInScope(id);
  const highest = await db.room.findFirst({ where: { buildingId: id }, orderBy: { floor: "desc" }, select: { floor: true } });
  if (highest && floors < highest.floor) {
    redirect(withFlash(`/buildings/${id}`, "err", `ลดชั้นไม่ได้ — ยังมีห้องอยู่ถึงชั้น ${highest.floor}`));
  }
  await db.building.update({ where: { id }, data: { name, code: text(f, "code") || null, floors } });
  revalidatePath("/buildings");
  revalidatePath("/rooms");
  redirect(withFlash(`/buildings/${id}`, "ok", "บันทึกข้อมูลตึกแล้ว"));
}

export async function deleteBuilding(f: FormData) {
  await requireRole("OWNER");
  const id = text(f, "id");
  await assertBuildingInScope(id);
  const rooms = await db.room.count({ where: { buildingId: id } });
  if (rooms > 0) redirect(withFlash(`/buildings/${id}`, "err", `ลบไม่ได้ — ตึกนี้ยังมี ${rooms} ห้อง ลบห้องให้หมดก่อน`));

  await db.building.delete({ where: { id } });
  revalidatePath("/buildings");
  revalidatePath("/rooms");
  redirect(withFlash("/buildings", "ok", "ลบตึกแล้ว"));
}

// ---------------------------------------------------------------
//  สร้างห้องเป็นชุด
// ---------------------------------------------------------------
export async function generateRooms(f: FormData) {
  await requireRole("OWNER");
  const buildingId = text(f, "buildingId");
  const back = `/buildings/${buildingId}`;
  const { building } = await assertBuildingInScope(buildingId);

  const from = int(f, "floorFrom", 1);
  const to = int(f, "floorTo", 1);
  const perFloor = int(f, "perFloor", 0);
  const start = int(f, "startNumber", 1);
  const digits = Math.min(3, Math.max(1, int(f, "digits", 2)));
  const prefix = text(f, "prefix");
  const roomTypeId = text(f, "roomTypeId");

  if (from < 1 || to < from || to > building.floors) redirect(withFlash(back, "err", `ชั้นต้องอยู่ระหว่าง 1–${building.floors}`));
  if (perFloor < 1 || perFloor > 60) redirect(withFlash(back, "err", "จำนวนห้องต่อชั้นต้องอยู่ระหว่าง 1–60"));
  if (!(await db.roomType.findUnique({ where: { id: roomTypeId } }))) redirect(withFlash(back, "err", "เลือกประเภทห้อง"));

  const existing = new Set((await db.room.findMany({ where: { buildingId }, select: { number: true } })).map((r) => r.number));
  const rooms: { number: string; floor: number }[] = [];
  for (let floor = from; floor <= to; floor++) {
    for (let i = 0; i < perFloor; i++) {
      const number = `${prefix}${floor}${String(start + i).padStart(digits, "0")}`;
      if (!existing.has(number)) rooms.push({ number, floor });
    }
  }
  if (rooms.length === 0) redirect(withFlash(back, "err", "ห้องทั้งหมดที่จะสร้างมีอยู่แล้ว"));

  // สร้างพร้อมมิเตอร์น้ำ-ไฟให้เลย ไม่งั้นห้องจะคิดบิลไม่ได้
  for (const r of rooms) {
    await db.room.create({
      data: {
        buildingId,
        roomTypeId,
        number: r.number,
        floor: r.floor,
        status: "VACANT",
        meters: { create: [{ utility: "WATER", maxReading: 9999 }, { utility: "ELECTRIC", maxReading: 99999 }] },
      },
    });
  }
  revalidatePath("/rooms");
  revalidatePath(back);
  redirect(withFlash(back, "ok", `สร้าง ${rooms.length} ห้องแล้ว (ข้ามห้องที่มีอยู่)`));
}

/** ลบห้องได้เฉพาะห้องที่ไม่เคยมีสัญญาหรือบิล ไม่งั้นประวัติจะหาย */
export async function deleteRoom(f: FormData) {
  await requireRole("OWNER");
  const id = text(f, "id");
  await assertRoomInScope(id);
  const room = await db.room.findUniqueOrThrow({ where: { id }, include: { _count: { select: { contracts: true, maintenance: true } } } });
  const back = `/buildings/${room.buildingId}`;
  if (room._count.contracts > 0) redirect(withFlash(back, "err", `ลบไม่ได้ — ห้อง ${room.number} เคยมีสัญญา ${room._count.contracts} ฉบับ`));
  if (room._count.maintenance > 0) redirect(withFlash(back, "err", `ลบไม่ได้ — ห้อง ${room.number} มีประวัติแจ้งซ่อม`));

  await db.$transaction(async (tx) => {
    await tx.meterReading.deleteMany({ where: { meter: { roomId: id } } });
    await tx.meter.deleteMany({ where: { roomId: id } });
    await tx.room.delete({ where: { id } });
  });
  revalidatePath("/rooms");
  revalidatePath(back);
  redirect(withFlash(back, "ok", `ลบห้อง ${room.number} แล้ว`));
}

// ---------------------------------------------------------------
//  ผังชั้น
// ---------------------------------------------------------------
export async function saveFloorPlan(f: FormData) {
  await requireRole("OWNER");
  const buildingId = text(f, "buildingId");
  const back = `/buildings/${buildingId}`;
  await assertBuildingInScope(buildingId);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text(f, "plan"));
  } catch {
    redirect(withFlash(back, "err", "ผังไม่ถูกต้อง"));
  }
  const plan = parsePlan(parsed);
  if (!plan) redirect(withFlash(back, "err", "ผังไม่ถูกต้อง"));
  if (plan.cols < MIN_COLS || plan.cols > MAX_COLS) redirect(withFlash(back, "err", "จำนวนคอลัมน์ไม่ถูกต้อง"));
  if (Object.values(plan.floors).some((c) => c.length > MAX_CELLS)) redirect(withFlash(back, "err", "ผังใหญ่เกินไป"));

  // ยอมรับเฉพาะห้องที่อยู่ในตึกนี้จริง กันผังอ้างห้องของตึกอื่น
  const valid = new Set((await db.room.findMany({ where: { buildingId }, select: { id: true } })).map((r) => r.id));
  for (const cells of Object.values(plan.floors)) {
    for (const c of cells) {
      if (c.t === "ROOM" && (!c.roomId || !valid.has(c.roomId))) {
        c.t = "EMPTY";
        delete c.roomId;
      }
    }
  }

  await db.building.update({ where: { id: buildingId }, data: { floorPlan: plan } });
  revalidatePath("/rooms");
  revalidatePath(back);
  redirect(withFlash(back, "ok", "บันทึกผังแล้ว"));
}

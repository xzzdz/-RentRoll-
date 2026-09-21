// งานแจ้งซ่อม — สร้างงาน / มอบหมาย / เปลี่ยนสถานะ / ปิดงาน (ใช้จาก server action ทั้งฝั่งเจ้าของและช่าง)
import type { MaintenanceStatus, Priority } from "@prisma/client";
import { db } from "./db";
import { bangkokToday } from "./period";
import { nextDocNo } from "./docno";
import { round2 } from "./billing";

/** error ที่แสดงให้ผู้ใช้เห็นได้ */
export class MaintenanceError extends Error {}

export const CATEGORIES = ["ไฟฟ้า", "ประปา", "แอร์", "เฟอร์นิเจอร์", "อินเทอร์เน็ต", "อื่น ๆ"];

/** งานที่ยังต้องตาม */
export const OPEN_STATUS: MaintenanceStatus[] = ["NEW", "ASSIGNED", "IN_PROGRESS"];

/** เปลี่ยนสถานะไปไหนได้บ้าง (DONE/CANCELLED คือปลายทาง) */
const NEXT: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  NEW: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "NEW", "CANCELLED"],
  IN_PROGRESS: ["DONE", "ASSIGNED", "CANCELLED"],
  DONE: [],
  CANCELLED: [],
};

export function canMove(from: MaintenanceStatus, to: MaintenanceStatus) {
  return NEXT[from].includes(to);
}

const dateOnly = (s?: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00Z`) : null);

/** ค่าซ่อมแก้ไขได้ตราบใดที่ยังไม่ถูกดึงเข้าบิลที่ส่งแล้ว */
async function assertNotBilled(requestId: string) {
  const billed = await db.invoiceItem.findFirst({
    where: { maintenanceId: requestId, invoice: { status: { notIn: ["DRAFT", "VOID"] } } },
    include: { invoice: { select: { invoiceNo: true } } },
  });
  if (billed) throw new MaintenanceError(`ค่าซ่อมนี้อยู่ในบิล ${billed.invoice.invoiceNo} ที่ส่งแล้ว แก้ไขไม่ได้`);
}

function parseCost(cost: number | null | undefined) {
  if (cost == null) return null;
  if (!Number.isFinite(cost) || cost < 0) throw new MaintenanceError("ค่าใช้จ่ายไม่ถูกต้อง");
  return round2(cost);
}

async function assertTechnician(id: string) {
  const tech = await db.user.findFirst({ where: { id, role: "TECHNICIAN", isActive: true } });
  if (!tech) throw new MaintenanceError("ไม่พบช่างที่เลือก");
  return tech;
}

/** เปิดงานใหม่ — ออกเลขที่ MT-YYYYMM-NNNN และผูกผู้เช่าปัจจุบันของห้องให้อัตโนมัติ */
export async function createRequest(
  input: {
    roomId: string;
    category: string;
    title: string;
    description?: string | null;
    priority: Priority;
    preferredTime?: string | null;
    assignedToId?: string | null;
    scheduledAt?: string | null;
  },
  userId: string,
) {
  const title = input.title.trim();
  if (!title) throw new MaintenanceError("ระบุเรื่องที่แจ้งซ่อม");

  const room = await db.room.findUnique({
    where: { id: input.roomId },
    include: {
      building: true,
      contracts: { where: { status: "ACTIVE" }, include: { tenants: { where: { isPrimary: true } } } },
    },
  });
  if (!room) throw new MaintenanceError("ไม่พบห้อง");

  const assignedToId = input.assignedToId || null;
  if (assignedToId) await assertTechnician(assignedToId);

  const status: MaintenanceStatus = assignedToId ? "ASSIGNED" : "NEW";
  return db.$transaction(async (tx) => {
    const ticketNo = await nextDocNo(tx, room.building.propertyId, "MAINTENANCE", bangkokToday());
    const req = await tx.maintenanceRequest.create({
      data: {
        ticketNo,
        roomId: room.id,
        tenantId: room.contracts[0]?.tenants[0]?.tenantId ?? null,
        category: input.category,
        title,
        description: input.description?.trim() || null,
        priority: input.priority,
        status,
        assignedToId,
        preferredTime: input.preferredTime?.trim() || null,
        scheduledAt: dateOnly(input.scheduledAt),
      },
    });
    await tx.maintenanceLog.create({
      data: { requestId: req.id, userId, toStatus: status, comment: assignedToId ? "เปิดงานและมอบหมายช่าง" : "เปิดงานแจ้งซ่อม" },
    });
    return req;
  });
}

/** มอบหมาย/เปลี่ยนช่าง — ใช้ได้กับงานที่ยังไม่ปิด */
export async function assignJob(
  input: { requestId: string; technicianId: string; scheduledAt?: string | null; comment?: string | null },
  userId: string,
) {
  const req = await db.maintenanceRequest.findUnique({ where: { id: input.requestId } });
  if (!req) throw new MaintenanceError("ไม่พบงานซ่อม");
  if (!OPEN_STATUS.includes(req.status)) throw new MaintenanceError("งานนี้ปิดแล้ว");

  const tech = await assertTechnician(input.technicianId);
  const toStatus: MaintenanceStatus = req.status === "NEW" ? "ASSIGNED" : req.status;
  const reassigned = req.assignedToId && req.assignedToId !== tech.id;

  await db.$transaction(async (tx) => {
    await tx.maintenanceRequest.update({
      where: { id: req.id },
      data: { assignedToId: tech.id, status: toStatus, scheduledAt: dateOnly(input.scheduledAt) ?? req.scheduledAt },
    });
    await tx.maintenanceLog.create({
      data: {
        requestId: req.id,
        userId,
        fromStatus: req.status,
        toStatus,
        comment: input.comment?.trim() || `${reassigned ? "เปลี่ยนช่างเป็น" : "มอบหมายให้"} ${tech.name}`,
      },
    });
  });
  return tech;
}

/**
 * เปลี่ยนสถานะงาน — ช่างทำได้เฉพาะงานของตัวเอง
 * ปิดงาน (DONE) บันทึกค่าใช้จ่ายได้ ถ้า chargeTenant = true ค่าซ่อมจะไปโผล่ในบิลรอบถัดไป
 */
export async function changeStatus(input: {
  requestId: string;
  to: MaintenanceStatus;
  userId: string;
  actorRole: "OWNER" | "TECHNICIAN";
  comment?: string | null;
  cost?: number | null;
  chargeTenant?: boolean;
}) {
  const req = await db.maintenanceRequest.findUnique({ where: { id: input.requestId } });
  if (!req) throw new MaintenanceError("ไม่พบงานซ่อม");
  if (input.actorRole === "TECHNICIAN" && req.assignedToId !== input.userId) throw new MaintenanceError("งานนี้ไม่ได้มอบหมายให้คุณ");
  if (!canMove(req.status, input.to)) throw new MaintenanceError("เปลี่ยนสถานะนี้ไม่ได้");
  if (input.to === "ASSIGNED" && !req.assignedToId) throw new MaintenanceError("ยังไม่ได้มอบหมายช่าง");

  const done = input.to === "DONE";
  const cost = done ? parseCost(input.cost) : null;
  if (done && cost != null) await assertNotBilled(req.id);
  // เรียกเก็บได้เฉพาะงานที่ผูกผู้เช่าไว้ ไม่งั้นค่าซ่อมจะไปโผล่ในบิลของผู้เช่ารายถัดไปของห้องนั้น
  const chargeTenant = done && cost != null && cost > 0 && req.tenantId != null ? (input.chargeTenant ?? false) : false;

  await db.$transaction(async (tx) => {
    await tx.maintenanceRequest.update({
      where: { id: req.id },
      data: {
        status: input.to,
        completedAt: done ? bangkokToday() : null,
        ...(done ? { cost, chargeTenant } : {}),
        ...(input.to === "NEW" ? { assignedToId: null } : {}),
      },
    });
    await tx.maintenanceLog.create({
      data: { requestId: req.id, userId: input.userId, fromStatus: req.status, toStatus: input.to, comment: input.comment?.trim() || null },
    });
  });
  return { cost, chargeTenant };
}

/** แก้ค่าใช้จ่าย/การเรียกเก็บของงานที่ปิดแล้ว (ตราบใดที่ยังไม่เข้าบิลที่ส่งแล้ว) */
export async function updateCharge(input: { requestId: string; cost: number | null; chargeTenant: boolean; userId: string }) {
  const req = await db.maintenanceRequest.findUnique({ where: { id: input.requestId } });
  if (!req) throw new MaintenanceError("ไม่พบงานซ่อม");
  if (req.status !== "DONE") throw new MaintenanceError("บันทึกค่าใช้จ่ายได้เฉพาะงานที่ปิดแล้ว");
  await assertNotBilled(req.id);

  const cost = parseCost(input.cost);
  const chargeTenant = cost != null && cost > 0 && req.tenantId != null ? input.chargeTenant : false;
  await db.$transaction(async (tx) => {
    await tx.maintenanceRequest.update({ where: { id: req.id }, data: { cost, chargeTenant } });
    await tx.maintenanceLog.create({
      data: {
        requestId: req.id,
        userId: input.userId,
        fromStatus: req.status,
        toStatus: req.status,
        comment: `แก้ค่าใช้จ่ายเป็น ${cost == null ? "-" : cost.toLocaleString("th-TH")} บาท${chargeTenant ? " · เรียกเก็บผู้เช่า" : ""}`,
      },
    });
  });
}

/** ค่าซ่อมที่รอเข้าบิลรอบถัดไป (ปิดงานแล้ว เรียกเก็บผู้เช่า และยังไม่อยู่ในบิลที่ส่งแล้ว) */
export async function pendingCharges(propertyId: string) {
  const rows = await db.maintenanceRequest.findMany({
    where: {
      room: { building: { propertyId } },
      status: "DONE",
      chargeTenant: true,
      cost: { gt: 0 },
      invoiceItems: { none: { invoice: { status: { notIn: ["DRAFT", "VOID"] } } } },
    },
    select: { cost: true },
  });
  return { count: rows.length, amount: round2(rows.reduce((s, r) => s + (r.cost?.toNumber() ?? 0), 0)) };
}

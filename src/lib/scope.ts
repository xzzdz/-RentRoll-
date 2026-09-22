// ตรวจว่า id ที่ส่งมาจากฟอร์มเป็นของหอที่ผู้ใช้สังกัดจริง
// ฟอร์มส่ง id อะไรมาก็ได้ ถ้าไม่ตรวจ ผู้ใช้หอหนึ่งจะแก้ข้อมูลของอีกหอได้
import { db } from "./db";
import { currentPropertyId } from "./auth";

export class ScopeError extends Error {
  constructor(what = "ข้อมูล") {
    super(`ไม่พบ${what}นี้ในหอของคุณ`);
  }
}

/** คืน propertyId ของผู้ใช้ปัจจุบัน แล้วตรวจว่าห้องนั้นอยู่ในหอเดียวกัน */
export async function assertRoomInScope(roomId: string) {
  const propertyId = await currentPropertyId();
  const room = await db.room.findFirst({ where: { id: roomId, building: { propertyId } }, select: { id: true, buildingId: true } });
  if (!room) throw new ScopeError("ห้อง");
  return { propertyId, room };
}

export async function assertBuildingInScope(buildingId: string) {
  const propertyId = await currentPropertyId();
  const building = await db.building.findFirst({ where: { id: buildingId, propertyId } });
  if (!building) throw new ScopeError("ตึก");
  return { propertyId, building };
}

export async function assertContractInScope(contractId: string) {
  const propertyId = await currentPropertyId();
  const contract = await db.contract.findFirst({ where: { id: contractId, room: { building: { propertyId } } }, select: { id: true, roomId: true } });
  if (!contract) throw new ScopeError("สัญญา");
  return { propertyId, contract };
}

export async function assertInvoiceInScope(invoiceId: string) {
  const propertyId = await currentPropertyId();
  const invoice = await db.invoice.findFirst({ where: { id: invoiceId, contract: { room: { building: { propertyId } } } }, select: { id: true } });
  if (!invoice) throw new ScopeError("บิล");
  return { propertyId, invoice };
}

export async function assertMaintenanceInScope(requestId: string) {
  const propertyId = await currentPropertyId();
  const req = await db.maintenanceRequest.findFirst({ where: { id: requestId, room: { building: { propertyId } } }, select: { id: true } });
  if (!req) throw new ScopeError("งานซ่อม");
  return { propertyId, req };
}

/** ใช้กับตารางที่มี propertyId ตรง ๆ (รายจ่าย ประกาศ ประเภทห้อง ค่าบริการ) */
export async function assertOwnRow(
  model: "expense" | "announcement" | "roomType" | "feeItem",
  id: string,
  label: string,
) {
  const propertyId = await currentPropertyId();
  // แต่ละ model มี field propertyId เหมือนกัน จึงใช้ where เดียวกันได้
  const found = await (db[model] as { findFirst(a: unknown): Promise<{ id: string } | null> }).findFirst({
    where: { id, propertyId },
    select: { id: true },
  });
  if (!found) throw new ScopeError(label);
  return propertyId;
}

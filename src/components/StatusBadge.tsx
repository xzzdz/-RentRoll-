import type { ContractStatus, InvoiceStatus, MaintenanceStatus, Priority, RoomStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

type V = "info" | "ok" | "warn" | "bad" | "muted";

export const ROOM_STATUS: Record<RoomStatus, [V, string]> = {
  OCCUPIED: ["info", "มีผู้เช่า"],
  VACANT: ["muted", "ว่าง"],
  RESERVED: ["warn", "จองแล้ว"],
  MAINTENANCE: ["bad", "ปิดปรับปรุง"],
};

export const INVOICE_STATUS: Record<InvoiceStatus, [V, string]> = {
  DRAFT: ["muted", "บิลร่าง"],
  ISSUED: ["info", "รอชำระ"],
  PARTIAL: ["warn", "ชำระบางส่วน"],
  PAID: ["ok", "ชำระแล้ว"],
  OVERDUE: ["bad", "เกินกำหนด"],
  VOID: ["muted", "ยกเลิก"],
};

export const CONTRACT_STATUS: Record<ContractStatus, [V, string]> = {
  DRAFT: ["muted", "ร่าง"],
  ACTIVE: ["ok", "ใช้งาน"],
  ENDED: ["muted", "สิ้นสุด"],
  TERMINATED: ["bad", "ยกเลิก"],
};

export const MAINTENANCE_STATUS: Record<MaintenanceStatus, [V, string]> = {
  NEW: ["bad", "แจ้งใหม่"],
  ASSIGNED: ["warn", "มอบหมายแล้ว"],
  IN_PROGRESS: ["info", "กำลังซ่อม"],
  DONE: ["ok", "เสร็จแล้ว"],
  CANCELLED: ["muted", "ยกเลิก"],
};

export const PRIORITY: Record<Priority, [V, string]> = {
  LOW: ["muted", "ไม่เร่ง"],
  NORMAL: ["muted", "ปกติ"],
  URGENT: ["bad", "ด่วน"],
};

export function StatusBadge({ map }: { map: [V, string] }) {
  return (
    <Badge variant={map[0]}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {map[1]}
    </Badge>
  );
}

// สีไทล์ห้อง — แหล่งเดียวที่ใช้ร่วมกันทั้งผังห้อง รายการห้องในตึก และตัวจัดผัง
// เป็น pure module (import แค่ type) จึงเรียกได้ทั้งฝั่ง server และ client
import type { RoomStatus } from "@prisma/client";

export const ROOM_TILE: Record<RoomStatus, string> = {
  OCCUPIED: "bg-room-live text-room-live-fg border-room-live-bd",
  VACANT: "bg-card text-room-free-fg border-room-free-bd border-dashed",
  RESERVED: "bg-room-hold text-room-hold-fg border-room-hold-bd",
  MAINTENANCE: "bg-room-closed text-room-closed-fg border-room-closed-bd hatch",
};

/** ค้างชำระทับสีสถานะเดิมเสมอ เพราะเป็นสิ่งที่เจ้าของต้องเห็นก่อนอย่างอื่น */
export const ROOM_TILE_OVERDUE = "bg-room-due text-room-due-fg border-room-due-bd";

export function roomTileClass(status: RoomStatus, overdue = false) {
  return overdue ? ROOM_TILE_OVERDUE : ROOM_TILE[status];
}

/**
 * แถบสัดส่วนห้อง — ใช้สีทึบอย่างเดียว เพราะแถบสูงไม่กี่พิกเซล
 * ขอบประกับลายทแยงจะมองไม่เห็น ใช้โทนกลาง (ตัว -bd ของแต่ละสถานะ)
 * ส่วนสองสถานะที่เป็นเทา เลือกให้ "ปิดปรับปรุง" เข้มกว่า "ว่าง" เพื่อสื่อว่าหนักกว่า
 */
export const ROOM_BAR: Record<RoomStatus, string> = {
  OCCUPIED: "bg-room-live-bd",
  RESERVED: "bg-room-hold-bd",
  MAINTENANCE: "bg-room-free-bd",
  VACANT: "bg-room-closed-bd",
};

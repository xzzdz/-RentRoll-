// พัสดุที่หอรับฝากไว้ — ไฟล์นี้ต้องไม่แตะฐานข้อมูล เพราะฟอร์มฝั่ง client ก็ import ไปใช้
import type { ParcelStatus } from "@prisma/client";

/** ขนส่งที่เจอบ่อยในไทย เรียงตามที่เจอบ่อยสุด — พิมพ์ชื่ออื่นเองได้ */
export const CARRIERS = ["Flash Express", "Kerry Express", "J&T Express", "ไปรษณีย์ไทย", "Shopee Express", "Lazada Express", "Best Express", "Ninja Van"];

/** ขนาดมีผลกับที่เก็บ กล่องใหญ่กับของเย็นต้องจัดการต่างกัน */
export const SIZES = ["ซอง", "กล่องเล็ก", "กล่องกลาง", "กล่องใหญ่", "ของเย็น/อาหาร"];

/** ค้างเกินกี่วันถือว่าต้องตามแล้ว — ของเย็นเสีย ที่เก็บเต็ม */
export const STALE_DAYS = 7;

export const OPEN_PARCEL: ParcelStatus[] = ["WAITING"];

/** วันที่ตามปฏิทินไทยของเวลาจริงหนึ่งจุด (เที่ยงคืน UTC แบบเดียวกับ bangkokToday) */
function bangkokDateOf(d: Date) {
  const n = new Date(d.getTime() + 7 * 3600_000);
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
}

/**
 * ค้างมากี่วันแล้ว — นับเป็น "วัน" ตามปฏิทิน ไม่ใช่ 24 ชั่วโมงเต็ม
 * ไม่งั้นของที่เพิ่งรับเข้าเมื่อบ่ายนี้จะกลายเป็น -1 วัน (เพราะ today คือเที่ยงคืน)
 * และของที่มาถึงเมื่อวานตอนเย็นจะนับเป็น 0 วันทั้งที่ข้ามวันมาแล้ว
 */
export function daysWaiting(receivedAt: Date, today: Date) {
  return Math.round((today.getTime() - bangkokDateOf(receivedAt)) / 86_400_000);
}

// รูปแบบรหัสเข้าใช้งานของผู้เช่า — pure module เพราะฟอร์มฝั่ง client ก็ต้องใช้
// ตัวสุ่มรหัสอยู่ใน tenant-auth.ts เพราะต้องใช้ node:crypto (ฝั่งเซิร์ฟเวอร์เท่านั้น)

/** ตัดตัวที่อ่านสับสนออก — ไม่มี 0/O, 1/I/L, U/V เพราะรหัสนี้ถูกอ่านออกเสียงและเขียนมือ */
export const INVITE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTWXYZ";

export const INVITE_LENGTH = 8;

/** โชว์เป็น XXXX-XXXX อ่านง่ายกว่า แต่เก็บในฐานเป็นตัวติดกัน */
export function formatInviteCode(code: string) {
  return code.length === INVITE_LENGTH ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

/** ผู้เช่าพิมพ์มาแบบไหนก็ได้ — มีขีด มีเว้นวรรค ตัวเล็ก */
export function normalizeInviteCode(input: string) {
  return input.replace(/[^0-9a-zA-Z]/g, "").toUpperCase();
}

export const normalizePhone = (input: string) => input.replace(/\D/g, "");

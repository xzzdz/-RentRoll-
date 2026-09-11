// เข้ารหัสข้อมูลส่วนบุคคล (เลขบัตรประชาชน) ด้วย AES-256-GCM ก่อนเก็บลงฐานข้อมูล
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function key(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) throw new Error("ENCRYPTION_KEY ต้องเป็น hex 64 ตัว (32 bytes) — ดู .env.example");
  return Buffer.from(hex, "hex");
}

/** คืนค่า "v1:<iv>:<tag>:<ciphertext>" (base64) */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), enc.toString("base64")].join(":");
}

export function decrypt(payload: string): string | null {
  try {
    const [v, iv, tag, data] = payload.split(":");
    if (v !== "v1") return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** แสดงแค่ 4 ตัวท้าย: x-xxxx-xxxxx-12-3 → •••••••••0123 */
export function maskIdCard(payload: string | null): string | null {
  if (!payload) return null;
  const plain = decrypt(payload);
  if (!plain) return "ถอดรหัสไม่ได้";
  const digits = plain.replace(/\D/g, "");
  return `${"•".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

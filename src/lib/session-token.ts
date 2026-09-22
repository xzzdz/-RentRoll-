// ใช้ได้ทั้งใน middleware (edge) และ server — ห้าม import next/headers ในไฟล์นี้
import { SignJWT, jwtVerify } from "jose";

export type Role = "OWNER" | "TECHNICIAN" | "TENANT";
/** propertyId = หอที่ผู้ใช้สังกัด ทุกหน้าฝั่งเจ้าของใช้ค่านี้ scope ข้อมูล */
export type Session = { userId: string; role: Role; name: string; propertyId: string };

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 วัน

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signSession(s: Session): Promise<string> {
  return new SignJWT({ userId: s.userId, role: s.role, name: s.name, propertyId: s.propertyId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key());
}

export async function verifySession(token?: string): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    const { userId, role, name, propertyId } = payload as Record<string, unknown>;
    if (typeof userId !== "string" || typeof role !== "string") return null;
    // token รุ่นก่อนไม่มี propertyId — ถือว่าใช้ไม่ได้ ผู้ใช้จะถูกพาไปล็อกอินใหม่
    if (typeof propertyId !== "string" || !propertyId) return null;
    return { userId, role: role as Role, name: String(name ?? ""), propertyId };
  } catch {
    return null;
  }
}

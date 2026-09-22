import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signSession,
  verifySession,
  type Role,
  type Session,
} from "./session-token";

export async function createSession(s: Session) {
  const token = await signSession(s);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}

/** ใช้ในทุก page/action ที่ต้องล็อกอิน — middleware กรองชั้นแรก ตรงนี้ตรวจซ้ำอีกชั้น */
export async function requireRole(...roles: Role[]): Promise<Session> {
  const s = await getSession();
  if (!s || !roles.includes(s.role)) redirect("/login");
  return s;
}

/**
 * รหัสหอของผู้ใช้ปัจจุบัน — ทุก query ฝั่งเจ้าของต้อง scope ด้วยค่านี้
 * ห้ามดึงหอด้วย findFirst เด็ดขาด ไม่งั้นพอมีหลายหอจะหยิบของคนอื่นมา
 */
export async function currentPropertyId(): Promise<string> {
  const s = await requireRole("OWNER");
  return s.propertyId;
}

export function homeFor(role: Role) {
  return role === "OWNER" ? "/dashboard" : role === "TECHNICIAN" ? "/tech" : "/login";
}

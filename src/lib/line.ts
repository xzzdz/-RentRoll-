// เข้าสู่ระบบด้วย LINE (LIFF) สำหรับฝั่งผู้เช่า
// ต้องไม่ import next/headers ที่นี่ เพราะหน้า /t/line ฝั่ง client อ่านค่า isLiffConfigured ผ่าน props

/** LIFF ID ใช้ฝั่ง client (ไม่ใช่ความลับ) · channel id ใช้ฝั่ง server ตอนตรวจ token */
export const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID ?? "";

export const isLiffConfigured = () => !!LIFF_ID && !!process.env.LINE_LOGIN_CHANNEL_ID;

export type LineProfile = { lineUserId: string; name: string | null; picture: string | null };

/**
 * ตรวจ ID token กับเซิร์ฟเวอร์ของ LINE
 *
 * ห้ามอ่าน payload ของ JWT เองแล้วเชื่อเลย — ใครก็ปลอม token ขึ้นมาได้
 * ต้องให้ LINE ยืนยันลายเซ็นให้ และต้องส่ง client_id ไปด้วยเพื่อให้ LINE
 * เช็คว่า token ใบนี้ออกให้ช่องทางของเราจริง ไม่ใช่ token ของแอปอื่นที่ถูกเอามาสวม
 */
export async function verifyLineIdToken(idToken: string): Promise<LineProfile | null> {
  const clientId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!clientId || !idToken) return null;

  let res: Response;
  try {
    res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ id_token: idToken, client_id: clientId }),
      cache: "no-store",
    });
  } catch {
    // LINE ล่มหรือเน็ตมีปัญหา — ถือว่าตรวจไม่ผ่าน ดีกว่าปล่อยให้เข้าได้
    return null;
  }
  if (!res.ok) return null;

  const data = (await res.json()) as { sub?: unknown; aud?: unknown; name?: unknown; picture?: unknown };
  // ย้ำอีกชั้นฝั่งเรา เผื่อวันหน้าพฤติกรรมของ endpoint เปลี่ยน
  if (typeof data.sub !== "string" || !data.sub || data.aud !== clientId) return null;

  return {
    lineUserId: data.sub,
    name: typeof data.name === "string" && data.name.trim() ? data.name.trim() : null,
    picture: typeof data.picture === "string" ? data.picture : null,
  };
}

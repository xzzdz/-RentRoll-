/** สร้าง URL พร้อมข้อความ toast สำหรับ redirect หลัง server action */
export function withFlash(path: string, kind: "ok" | "err", message: string) {
  const [base, query = ""] = path.split("?");
  const p = new URLSearchParams(query);
  p.set(kind, message);
  return `${base}?${p}`;
}

/**
 * รับเฉพาะ path ภายในเว็บ — ฟอร์มส่งค่าอะไรมาก็ได้ ถ้าเอาไป redirect ดิบ ๆ
 * จะพาผู้ใช้ออกไปเว็บนอกได้ (//evil.com ก็นับเป็น path ที่เบราว์เซอร์มองว่าเป็นโดเมนอื่น)
 */
export function safePath(value: unknown, fallback: string) {
  const s = String(value ?? "");
  return s.startsWith("/") && !s.startsWith("//") ? s : fallback;
}

/** สร้าง URL พร้อมข้อความ toast สำหรับ redirect หลัง server action */
export function withFlash(path: string, kind: "ok" | "err", message: string) {
  const [base, query = ""] = path.split("?");
  const p = new URLSearchParams(query);
  p.set(kind, message);
  return `${base}?${p}`;
}

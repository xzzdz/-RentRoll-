// สร้างไฟล์ CSV ที่ Excel ภาษาไทยเปิดแล้วไม่เป็นตัวต่างดาว

/** ครอบค่าด้วย " เมื่อมีตัวคั่น ขึ้นบรรทัดใหม่ หรือ " อยู่ข้างใน */
function cell(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

/**
 * Excel บน Windows อ่าน CSV เป็น ANSI ถ้าไม่มี BOM ทำให้ภาษาไทยเพี้ยนทั้งไฟล์
 * ใส่ BOM (﻿) ไว้หน้าสุดเสมอ และปิดท้ายบรรทัดด้วย CRLF ตามที่ Excel คาดหวัง
 */
export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(cell).join(","), ...rows.map((r) => r.map(cell).join(","))];
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** ชื่อไฟล์ที่ปลอดภัยกับทุกระบบ + ส่งเป็น header ให้เบราว์เซอร์ดาวน์โหลด */
export function csvResponse(filename: string, body: string): Response {
  const safe = filename.replace(/[^\w.\-]+/g, "_");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}

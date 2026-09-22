"use client";

import "./globals.css";

/**
 * ชั้นสุดท้ายจริง ๆ — ใช้ตอน root layout เองพัง จึงต้องมี html/body ของตัวเอง
 * และห้ามพึ่งคอมโพเนนต์อื่น เพราะของพวกนั้นอาจเป็นต้นเหตุที่ทำให้พัง
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="th">
      <body className="font-sans antialiased">
        <div style={{ display: "grid", minHeight: "100dvh", placeItems: "center", padding: "24px", textAlign: "center" }}>
          <div style={{ display: "grid", gap: "12px", maxWidth: "420px" }}>
            <h1 style={{ fontSize: "17px", fontWeight: 600 }}>ระบบขัดข้อง</h1>
            <p style={{ fontSize: "13.5px", color: "#52525b", lineHeight: 1.7 }}>
              เปิดหน้านี้ไม่สำเร็จ ลองโหลดใหม่อีกครั้ง ถ้ายังไม่ได้ให้แจ้งผู้ดูแลระบบ
            </p>
            {error.digest && <p style={{ fontSize: "11.5px", color: "#71717a" }}>รหัสอ้างอิง {error.digest}</p>}
            <button
              onClick={reset}
              style={{ justifySelf: "center", borderRadius: "8px", background: "#4f46e5", color: "#fff", padding: "10px 20px", fontSize: "14px" }}
            >
              โหลดใหม่
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

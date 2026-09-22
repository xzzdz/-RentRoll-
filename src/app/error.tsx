"use client";

import { ErrorState } from "@/components/ErrorState";

/** ตาข่ายรับชั้นนอกสุด — หน้าที่ไม่ได้อยู่ใต้ shell ไหนเลย เช่น หน้าล็อกอินหรือหน้าพิมพ์ */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <ErrorState error={error} reset={reset} homeHref="/" />
    </div>
  );
}

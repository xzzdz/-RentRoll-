"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** พิมพ์เอกสารเต็มหน้า A4 ที่ซ่อนไว้ในหน้าเดียวกัน — บนมือถือจะได้ตัวเลือก "บันทึกเป็น PDF" */
export function PrintButton() {
  return (
    <Button variant="outline" className="no-print w-full" onClick={() => window.print()}>
      <Printer /> พิมพ์ / บันทึกเป็น PDF
    </Button>
  );
}

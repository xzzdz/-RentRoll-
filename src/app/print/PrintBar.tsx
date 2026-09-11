"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintBar({ title }: { title: string }) {
  return (
    <div className="no-print bg-card sticky top-0 z-10 flex items-center justify-between gap-3 border-b px-4 py-2">
      <span className="text-muted-foreground text-sm">{title} · เลือก &quot;บันทึกเป็น PDF&quot; ในหน้าต่างพิมพ์เพื่อได้ไฟล์ PDF</span>
      <Button size="sm" onClick={() => window.print()}>
        <Printer /> พิมพ์ / PDF
      </Button>
    </div>
  );
}

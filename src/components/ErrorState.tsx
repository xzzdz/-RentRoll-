"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * หน้าจอตอนเกิดข้อผิดพลาด — ใช้ร่วมกันทุก error boundary
 * Next.js ซ่อนข้อความ error จริงบน production เหลือแต่ digest เราจึงบอกผู้ใช้แค่ว่าให้ลองใหม่
 * แล้วโชว์ digest ไว้ให้แจ้งคนดูแลระบบตามรอยต่อได้
 */
export function ErrorState({
  error,
  reset,
  title = "เกิดข้อผิดพลาด",
  description = "ระบบทำงานไม่สำเร็จ ลองใหม่อีกครั้ง ถ้ายังไม่ได้ให้กลับไปหน้าแรกแล้วเข้ามาใหม่",
  homeHref = "/dashboard",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  homeHref?: string;
}) {
  return (
    <div className="bg-card mx-auto grid max-w-md justify-items-center gap-3 rounded-xl border p-8 text-center">
      <span className="bg-bad-soft text-destructive grid size-12 place-items-center rounded-full">
        <AlertTriangle className="size-6" aria-hidden />
      </span>
      <h1 className="font-display text-[17px] font-semibold">{title}</h1>
      <p className="text-muted-foreground text-[13.5px] leading-relaxed">{description}</p>

      {error.digest && (
        <p className="text-subtle text-[11.5px]">
          รหัสอ้างอิง <span className="num">{error.digest}</span>
        </p>
      )}

      <div className="mt-1 flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>
          <RefreshCw /> ลองใหม่
        </Button>
        <Button variant="outline" asChild>
          <Link href={homeHref}>กลับหน้าแรก</Link>
        </Button>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="bg-card grid max-w-md justify-items-center gap-3 rounded-xl border p-8 text-center">
        <b className="num font-display text-[34px] leading-none">404</b>
        <h1 className="font-display text-[17px] font-semibold">ไม่พบหน้านี้</h1>
        <p className="text-muted-foreground text-[13.5px] leading-relaxed">
          หน้าที่เปิดอาจถูกย้าย ถูกลบ หรือคุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้
        </p>
        <Button asChild className="mt-1">
          <Link href="/dashboard">กลับหน้าแรก</Link>
        </Button>
      </div>
    </div>
  );
}

/**
 * หน้ารอตอนเปิดเว็บครั้งแรก — โลโก้ไล่ขึ้นมาพร้อมแถบความคืบหน้า
 * ใช้ CSS ล้วน ไม่มี JS และไม่โหลดไฟล์แอนิเมชันเพิ่ม จะได้ขึ้นทันทีแม้เน็ตช้า
 */
import { BRAND, LogoMark } from "@/components/Logo";

export function Splash({ label = "กำลังเตรียมข้อมูล…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="bg-background grid min-h-dvh place-items-center px-6">
      <div className="grid justify-items-center gap-4">
        <LogoMark className="animate-rise size-14" />
        <div className="grid justify-items-center gap-1 text-center">
          <b className="font-display animate-rise text-lg font-semibold [animation-delay:60ms]">{BRAND.name}</b>
          <span className="text-muted-foreground animate-rise text-[13px] [animation-delay:120ms]">{label}</span>
        </div>
        <div className="bg-muted mt-1 h-1 w-40 overflow-hidden rounded-full">
          <i className="bg-primary block h-full w-1/3 rounded-full motion-safe:animate-[slide_1.1s_ease-in-out_infinite]" />
        </div>
      </div>
      <style>{`@keyframes slide{0%{transform:translateX(-110%)}100%{transform:translateX(330%)}}`}</style>
    </div>
  );
}

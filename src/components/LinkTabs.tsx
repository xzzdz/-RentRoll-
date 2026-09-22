import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * แท็บที่เป็นลิงก์จริง — กดแล้วเปลี่ยน URL และเรนเดอร์ใหม่ที่เซิร์ฟเวอร์
 * จึงใช้ Tabs ของ Radix ไม่ได้ (อันนั้นสลับแผงฝั่ง client และต้องเรนเดอร์ทุกแผงพร้อมกัน)
 * แต่หน้าตายืมโครงเดียวกับ TabsList/TabsTrigger ของ shadcn มา เพื่อให้ทั้งเว็บดูเป็นชุดเดียวกัน
 *
 * ต่างจากต้นฉบับอยู่จุดเดียว: แท็บที่เลือกอยู่ใช้พื้น card (ขาว) ไม่ใช่ background
 * เพราะพื้นหลังของระบบนี้เป็นเทาอ่อนอยู่แล้ว ถ้าใช้ตามต้นฉบับจะแทบแยกไม่ออกจากรางแท็บ
 */
export function LinkTabs({
  items,
  current,
  label,
  className,
}: {
  items: { key: string; href: string; label: string }[];
  current: string;
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn("bg-muted inline-flex h-9 w-fit items-center gap-0.5 rounded-lg p-[3px]", className)}>
      {items.map((t) => {
        const on = t.key === current;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "inline-flex h-full items-center justify-center rounded-md border border-transparent px-3 text-sm font-medium whitespace-nowrap transition-colors",
              on ? "bg-card text-foreground shadow-sm" : "text-foreground/60 hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

import { cn } from "@/lib/utils";

export const BRAND = {
  name: "RentRoll",
  nameTh: "เรนต์โรล",
  tagline: "ระบบบริหารหอพักและอพาร์ตเมนต์",
} as const;

/**
 * เครื่องหมายการค้า — แถบบัญชีสามเส้นลดหลั่นในกรอบสี่เหลี่ยมมุมมน
 * สื่อถึง rent roll (บัญชีห้อง-ค่าเช่า) อ่านออกตั้งแต่ขนาด 16px จนถึงป้ายใหญ่
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" role="img" aria-label={BRAND.name} className={cn("size-8", className)}>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <g className="fill-primary-foreground">
        <rect x="8" y="9" width="16" height="2.5" rx="1.25" />
        <rect x="8" y="14.75" width="11.5" height="2.5" rx="1.25" />
        <rect x="8" y="20.5" width="7" height="2.5" rx="1.25" />
      </g>
    </svg>
  );
}

/** โลโก้เต็ม — เครื่องหมาย + ชื่อ ใช้ตรงหัวหน้าจอและหน้าล็อกอิน */
export function Logo({ className, markClassName, sub }: { className?: string; markClassName?: string; sub?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />
      <span className="grid">
        <b className="font-display text-[16px] leading-tight font-semibold tracking-tight">{BRAND.name}</b>
        {sub && <span className="text-subtle text-[11px] leading-tight">{sub}</span>}
      </span>
    </span>
  );
}

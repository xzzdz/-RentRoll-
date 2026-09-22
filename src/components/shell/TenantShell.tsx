"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, Home, LogOut, Megaphone, ReceiptText, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { tenantLogout } from "@/app/t/login/actions";

/** ห้าอย่างที่ผู้เช่าเปิดบ่อยที่สุด — ส่วนสัญญาอยู่ในหน้าแรก เพราะเปิดดูปีละครั้ง */
const TABS = [
  { href: "/t", label: "หน้าแรก", icon: Home },
  { href: "/t/bills", label: "บิล", icon: ReceiptText },
  { href: "/t/repairs", label: "แจ้งซ่อม", icon: Wrench },
  { href: "/t/meters", label: "มิเตอร์", icon: Gauge },
  { href: "/t/announcements", label: "ประกาศ", icon: Megaphone },
];

const isOn = (path: string, href: string) => (href === "/t" ? path === "/t" : path === href || path.startsWith(`${href}/`));

/**
 * โครงหน้าฝั่งผู้เช่า — คิดจากมือถือล้วน เพราะผู้เช่าแทบไม่เปิดคอมพิวเตอร์
 * จอใหญ่แค่จำกัดความกว้างไว้ ไม่ได้ทำเนวิเกชันคนละชุด
 */
export function TenantShell({ name, roomNumber, propertyName, children }: { name: string; roomNumber: string; propertyName: string; children: React.ReactNode }) {
  const path = usePathname();

  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      <header className="bg-card/90 no-print sticky top-0 z-30 flex items-center gap-2.5 border-b px-4 py-2.5 backdrop-blur">
        <LogoMark className="size-8 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-subtle truncate text-[11px] leading-none">{propertyName}</div>
          <b className="font-display block truncate text-[14px] leading-tight">
            ห้อง <span className="num">{roomNumber}</span> · {name}
          </b>
        </div>
        <form action={tenantLogout}>
          <Button variant="ghost" size="icon-sm" type="submit" aria-label="ออกจากระบบ" className="text-muted-foreground">
            <LogOut />
          </Button>
        </form>
      </header>

      <main className="px-4 py-5 pb-24 print:p-0">{children}</main>

      <nav aria-label="เมนูหลัก" className="bg-card pb-safe no-print fixed inset-x-0 bottom-0 z-30 mx-auto grid max-w-lg grid-cols-5 border-t pt-1">
        {TABS.map((t) => {
          const on = isOn(path, t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={on ? "page" : undefined}
              className={cn("grid min-h-12 justify-items-center gap-0.5 rounded-lg py-1", on ? "text-primary" : "text-muted-foreground")}
            >
              <t.icon className="size-[21px]" aria-hidden />
              <span className="text-[10.5px] leading-none font-medium">{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

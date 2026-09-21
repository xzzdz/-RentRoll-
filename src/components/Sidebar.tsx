"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Gauge, LayoutDashboard, LogOut, ReceiptText, Settings, Users, Wrench } from "lucide-react";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "ภาพรวม", icon: LayoutDashboard },
  { href: "/rooms", label: "ผังห้อง", icon: Building2 },
  { href: "/tenants", label: "ผู้เช่า & สัญญา", icon: Users, also: ["/contracts"] },
  { href: "/meters", label: "จดมิเตอร์", icon: Gauge },
  { href: "/billing", label: "บิล & ใบเสร็จ", icon: ReceiptText },
  { href: "/maintenance", label: "แจ้งซ่อม", icon: Wrench },
  { href: "/settings", label: "ตั้งค่า", icon: Settings },
];

export function Sidebar({ name, propertyName }: { name: string; propertyName: string }) {
  const path = usePathname();
  return (
    <nav aria-label="เมนูหลัก" className="flex gap-1 overflow-x-auto pb-1 md:sticky md:top-6 md:flex-col md:overflow-visible">
      <div className="mb-4 hidden items-center gap-2.5 md:flex">
        <span className="bg-foreground text-background rounded-md px-2 py-0.5 font-display text-[15px] font-bold tracking-wide">บส</span>
        <b className="font-display text-base leading-tight font-semibold">{propertyName}</b>
      </div>
      {ITEMS.map(({ href, label, icon: Icon, also }) => {
        const active = [href, ...(also ?? [])].some((p) => path.startsWith(p));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 font-medium whitespace-nowrap",
              active ? "bg-accent text-accent-foreground font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
      <div className="mt-4 hidden border-t pt-3 text-[12.5px] md:block">
        <div className="eyebrow">เข้าสู่ระบบในฐานะ</div>
        <b>{name}</b> · เจ้าของ
        <form action={logout} className="mt-2">
          <Button variant="outline" size="sm" type="submit">
            <LogOut /> ออกจากระบบ
          </Button>
        </form>
      </div>
    </nav>
  );
}

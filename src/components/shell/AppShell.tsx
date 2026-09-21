"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { logout } from "@/app/login/actions";
import { groupFor, isActive, MOBILE_TABS, NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";

/**
 * โครงหน้าฝั่งเจ้าของ — จอใหญ่เป็นเนวิเกชันสองชั้น (แถบไอคอนหมวด + เมนูย่อยของหมวด)
 * จอเล็กเป็นแถบบน + แท็บล่าง 5 ปุ่ม โดยปุ่มสุดท้ายเปิดเมนูเต็มจอ
 */
export function AppShell({ name, propertyName, children }: { name: string; propertyName: string; children: React.ReactNode }) {
  const path = usePathname();
  const group = groupFor(path);
  const [menuOpen, setMenuOpen] = useState(false);

  // ปิดเมนูเองเมื่อเปลี่ยนหน้า ไม่งั้นเมนูค้างทับเนื้อหา
  useEffect(() => setMenuOpen(false), [path]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[68px_212px_1fr]">
      {/* ---------- แถบไอคอนหมวด (จอใหญ่) ---------- */}
      <nav aria-label="หมวดหลัก" className="bg-rail text-rail-foreground sticky top-0 hidden h-dvh flex-col items-center gap-1 py-3 lg:flex">
        <Link href="/dashboard" className="mb-3 grid size-10 place-items-center rounded-xl bg-white/10 font-display text-[15px] font-bold" title={propertyName}>
          บส
        </Link>
        {NAV.map((g) => {
          const on = g.key === group.key;
          return (
            <Link
              key={g.key}
              href={g.href}
              aria-current={on ? "page" : undefined}
              title={g.label}
              className={cn(
                "relative grid w-full place-items-center gap-0.5 rounded-xl py-2 transition-colors",
                on ? "text-rail-active" : "text-rail-foreground/70 hover:text-rail-foreground",
              )}
            >
              {on && <i className="bg-rail-active absolute top-1/2 left-0 h-7 w-[3px] -translate-y-1/2 rounded-r-full" aria-hidden />}
              <g.icon className="size-[20px]" aria-hidden />
              <span className="text-[10px] leading-tight font-medium">{g.label}</span>
            </Link>
          );
        })}
        <div className="mt-auto grid w-full justify-items-center gap-1">
          <ThemeToggle className="hover:bg-white/10 text-rail-foreground/70 hover:text-rail-foreground min-h-10 px-2" />
          <form action={logout}>
            <button type="submit" title="ออกจากระบบ" className="text-rail-foreground/70 hover:bg-white/10 hover:text-rail-foreground grid min-h-10 w-full place-items-center rounded-lg px-2">
              <LogOut className="size-[18px]" aria-hidden />
            </button>
          </form>
        </div>
      </nav>

      {/* ---------- เมนูย่อยของหมวดที่เลือก (จอใหญ่) ---------- */}
      <aside aria-label={`เมนู${group.label}`} className="bg-card sticky top-0 hidden h-dvh flex-col border-r lg:flex">
        <div className="border-b px-4 py-3.5">
          <div className="eyebrow">{group.label}</div>
          <b className="font-display block truncate text-[15px] leading-tight font-semibold">{propertyName}</b>
        </div>
        <div className="grid gap-0.5 p-2">
          {group.items.map((i) => {
            const on = isActive(path, i.href);
            return (
              <Link
                key={i.href}
                href={i.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "grid gap-0.5 rounded-lg px-3 py-2 transition-colors",
                  on ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                )}
              >
                <span className="flex items-center gap-2 text-[13.5px] font-semibold">
                  <i.icon className="size-4 shrink-0" aria-hidden />
                  {i.label}
                </span>
                {i.desc && <span className={cn("text-[11.5px] leading-snug", on ? "text-accent-foreground/75" : "text-subtle")}>{i.desc}</span>}
              </Link>
            );
          })}
        </div>
        <div className="text-subtle mt-auto border-t px-4 py-3 text-[12px]">
          เข้าสู่ระบบในฐานะ
          <b className="text-foreground block truncate text-[13px]">{name}</b>
        </div>
      </aside>

      {/* ---------- แถบบน (จอเล็ก) ---------- */}
      <header className="bg-card/85 sticky top-0 z-30 flex items-center gap-2 border-b px-4 py-2.5 backdrop-blur lg:hidden">
        <span className="bg-foreground text-background font-display grid size-8 shrink-0 place-items-center rounded-lg text-[13px] font-bold">บส</span>
        <div className="min-w-0 flex-1">
          <div className="text-subtle text-[11px] leading-none">{group.label}</div>
          <b className="font-display block truncate text-[14px] leading-tight">{propertyName}</b>
        </div>
        <ThemeToggle />
      </header>

      <div className="min-w-0 px-4 py-5 pb-24 lg:px-7 lg:py-6 lg:pb-8">{children}</div>

      {/* ---------- แท็บล่าง (จอเล็ก) ---------- */}
      <nav aria-label="เมนูหลัก" className="bg-card/95 pb-safe fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t pt-1 backdrop-blur lg:hidden">
        {MOBILE_TABS.map((t) => {
          const on = isActive(path, t.href);
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
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-expanded={menuOpen}
          className="text-muted-foreground grid min-h-12 justify-items-center gap-0.5 rounded-lg py-1"
        >
          <Menu className="size-[21px]" aria-hidden />
          <span className="text-[10.5px] leading-none font-medium">เพิ่มเติม</span>
        </button>
      </nav>

      {/* ---------- เมนูเต็มจอ (จอเล็ก) ---------- */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="ปิดเมนู" onClick={() => setMenuOpen(false)} className="absolute inset-0 bg-black/40" />
          <div className="bg-card animate-rise absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl pb-safe">
            <div className="bg-card sticky top-0 flex items-center justify-between border-b px-4 py-3">
              <b className="font-display text-base">เมนูทั้งหมด</b>
              <Button variant="ghost" size="sm" onClick={() => setMenuOpen(false)} aria-label="ปิด">
                <X />
              </Button>
            </div>
            <div className="grid gap-4 p-4">
              {NAV.map((g) => (
                <section key={g.key} className="grid gap-1.5">
                  <div className="eyebrow flex items-center gap-1.5">
                    <g.icon className="size-3.5" aria-hidden /> {g.label}
                  </div>
                  <div className="grid gap-1">
                    {g.items.map((i) => (
                      <Link
                        key={i.href}
                        href={i.href}
                        className={cn(
                          "flex min-h-12 items-center gap-2.5 rounded-xl border px-3 text-[14px]",
                          isActive(path, i.href) ? "bg-accent text-accent-foreground border-transparent font-semibold" : "bg-background",
                        )}
                      >
                        <i.icon className="size-4 shrink-0" aria-hidden /> {i.label}
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
              <form action={logout} className="border-t pt-4">
                <Button variant="outline" type="submit" className="w-full">
                  <LogOut /> ออกจากระบบ ({name})
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

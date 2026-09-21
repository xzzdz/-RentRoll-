"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/** สลับธีมสว่าง/มืด — ค่าเริ่มต้นตามระบบ เลือกแล้วจำไว้ใน localStorage */
export function ThemeToggle({ className, showLabel = false }: { className?: string; showLabel?: boolean }) {
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setReady(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // โหมดส่วนตัวของเบราว์เซอร์อาจเขียนไม่ได้ — ไม่เป็นไร ใช้ได้ถึงปิดแท็บ
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "เปลี่ยนเป็นธีมสว่าง" : "เปลี่ยนเป็นธีมมืด"}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 transition-colors",
        "hover:bg-muted text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {ready && dark ? <Sun className="size-[18px]" aria-hidden /> : <Moon className="size-[18px]" aria-hidden />}
      {showLabel && <span className="text-sm">{ready && dark ? "ธีมสว่าง" : "ธีมมืด"}</span>}
    </button>
  );
}

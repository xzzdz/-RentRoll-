"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

// ตัดการพึ่ง next-themes ออก — ระบบนี้ใช้ธีมสว่างอย่างเดียว
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="bottom-center"
      richColors
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };

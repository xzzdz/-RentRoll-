"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/** แสดง toast จาก ?ok=... หรือ ?err=... ที่ server action ส่งมาหลัง redirect แล้วลบออกจาก URL */
export function FlashToast() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const ok = params.get("ok");
  const err = params.get("err");

  useEffect(() => {
    if (!ok && !err) return;
    if (ok) toast.success(ok);
    if (err) toast.error(err);
    const next = new URLSearchParams(params);
    next.delete("ok");
    next.delete("err");
    router.replace(next.size ? `${path}?${next}` : path, { scroll: false });
  }, [ok, err]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

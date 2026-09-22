"use client";

import { ErrorState } from "@/components/ErrorState";

export default function TenantError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState error={error} reset={reset} homeHref="/t" description="ระบบทำงานไม่สำเร็จ ลองใหม่อีกครั้ง ถ้ายังไม่ได้ให้แจ้งสำนักงานหอพัก" />;
}

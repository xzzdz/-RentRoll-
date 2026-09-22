"use client";

import { ErrorState } from "@/components/ErrorState";

/** พังในหน้าฝั่งเจ้าของ — เมนูยังอยู่ เพราะ boundary อยู่ใต้ layout ที่มี AppShell */
export default function OwnerError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState error={error} reset={reset} />;
}

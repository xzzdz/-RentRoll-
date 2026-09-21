import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppShell } from "@/components/shell/AppShell";
import { FlashToast } from "@/components/FlashToast";
import { Toaster } from "@/components/ui/sonner";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("OWNER");
  const property = await db.property.findFirst({ select: { name: true } });

  return (
    <>
      <AppShell name={session.name} propertyName={property?.name ?? "หอพัก"}>
        {property ? (
          children
        ) : (
          <div className="bg-card rounded-xl border p-6">
            ยังไม่มีข้อมูลหอพัก — รัน <code className="num">npm run db:seed</code> ก่อน
          </div>
        )}
      </AppShell>
      <Suspense>
        <FlashToast />
      </Suspense>
      <Toaster />
    </>
  );
}

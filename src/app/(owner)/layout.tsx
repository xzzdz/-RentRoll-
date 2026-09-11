import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/Sidebar";
import { FlashToast } from "@/components/FlashToast";
import { Toaster } from "@/components/ui/sonner";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("OWNER");
  const property = await db.property.findFirst({ select: { name: true } });

  return (
    <div className="mx-auto grid max-w-[1320px] gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
      <Sidebar name={session.name} propertyName={property?.name ?? "หอพัก"} />
      <main className="min-w-0">
        {property ? (
          children
        ) : (
          <div className="bg-card rounded-xl border p-6">
            ยังไม่มีข้อมูลหอพัก — รัน <code className="num">npm run db:seed</code> ก่อน
          </div>
        )}
      </main>
      <Suspense>
        <FlashToast />
      </Suspense>
      <Toaster />
    </div>
  );
}

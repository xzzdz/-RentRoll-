import { Suspense } from "react";
import { db } from "@/lib/db";
import { currentTenant } from "@/lib/tenant-auth";
import { TenantShell } from "@/components/shell/TenantShell";
import { FlashToast } from "@/components/FlashToast";
import { Toaster } from "@/components/ui/sonner";

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const t = await currentTenant();
  const property = await db.property.findUniqueOrThrow({ where: { id: t.propertyId }, select: { name: true } });

  return (
    <>
      <TenantShell name={t.name.split(" ")[0]} roomNumber={t.room.number} propertyName={property.name}>
        {children}
      </TenantShell>
      <Suspense>
        <FlashToast />
      </Suspense>
      <Toaster />
    </>
  );
}

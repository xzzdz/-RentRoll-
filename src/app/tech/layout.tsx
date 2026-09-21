import { Suspense } from "react";
import { FlashToast } from "@/components/FlashToast";
import { Toaster } from "@/components/ui/sonner";

export default function TechLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Suspense>
        <FlashToast />
      </Suspense>
      <Toaster />
    </>
  );
}

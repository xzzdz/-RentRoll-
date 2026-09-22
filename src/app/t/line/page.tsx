import Link from "next/link";
import { BRAND, Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { LIFF_ID, isLiffConfigured } from "@/lib/line";
import { LiffGate } from "./LiffGate";

export const metadata = { title: "เข้าสู่ระบบด้วย LINE" };

/** หน้าปลายทางของ LIFF — ผู้เช่าเปิดจากเมนูใน LINE แล้วมาโผล่ที่นี่ */
export default function LineLoginPage() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-sm content-center gap-6 px-6 py-12">
      <Logo markClassName="size-9" sub={BRAND.tagline} />

      {isLiffConfigured() ? (
        <LiffGate liffId={LIFF_ID} />
      ) : (
        /* ยังไม่ได้ตั้งค่า LIFF — บอกให้ชัดว่าต้องทำอะไร ดีกว่าปล่อยให้หน้าค้างหมุน */
        <div className="bg-card grid gap-2 rounded-xl border border-dashed p-5 text-[13px]">
          <b className="font-display text-[14.5px]">ยังไม่ได้เปิดใช้งานการเข้าผ่าน LINE</b>
          <p className="text-muted-foreground leading-relaxed">
            ผู้ดูแลระบบต้องตั้งค่า <span className="num">NEXT_PUBLIC_LIFF_ID</span> และ <span className="num">LINE_LOGIN_CHANNEL_ID</span> ก่อน
            (ดูขั้นตอนใน README หัวข้อ &ldquo;เข้าสู่ระบบด้วย LINE&rdquo;)
          </p>
          <Button asChild className="mt-1 justify-self-start">
            <Link href="/t/login">เข้าด้วยรหัสเข้าใช้งาน</Link>
          </Button>
        </div>
      )}
    </main>
  );
}

import Link from "next/link";
import { Gauge, HelpCircle, ReceiptText, Wrench } from "lucide-react";
import { isLiffConfigured } from "@/lib/line";
import { Button } from "@/components/ui/button";
import { BRAND, Logo } from "@/components/Logo";
import { TenantLoginForm } from "./TenantLoginForm";

export const metadata = { title: "เข้าใช้งานสำหรับผู้เช่า" };

const WHAT = [
  { icon: ReceiptText, text: "ดูบิลเดือนนี้ ยอดค้าง และใบเสร็จย้อนหลัง" },
  { icon: Gauge, text: "ดูเลขน้ำ-ไฟว่าเดือนนี้ใช้ไปเท่าไหร่" },
  { icon: Wrench, text: "แจ้งซ่อมเองและตามสถานะได้" },
];

export default function TenantLoginPage() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-sm content-center gap-7 px-6 py-12">
      <div>
        <Logo className="mb-6" markClassName="size-9" sub={BRAND.tagline} />
        <h1 className="font-display text-xl font-semibold">สำหรับผู้เช่า</h1>
        <p className="text-muted-foreground text-[13px]">เข้าด้วยรหัสที่ได้จากสำนักงาน ไม่ต้องตั้งรหัสผ่าน</p>
      </div>

      <TenantLoginForm />

      {/* โชว์เฉพาะตอนตั้งค่า LIFF แล้ว ไม่งั้นกดไปก็เจอหน้าบอกว่ายังไม่ได้เปิดใช้งาน */}
      {isLiffConfigured() && (
        <div className="grid gap-3">
          <div className="text-subtle flex items-center gap-3 text-[11.5px]">
            <span className="bg-border h-px flex-1" /> หรือ <span className="bg-border h-px flex-1" />
          </div>
          <Button variant="outline" asChild className="h-12 text-[15px]">
            <Link href="/t/line">
              <span className="grid size-5 place-items-center rounded-[5px] bg-[#06C755] text-[11px] font-bold text-white" aria-hidden>
                L
              </span>
              เข้าสู่ระบบด้วย LINE
            </Link>
          </Button>
        </div>
      )}

      <ul className="grid gap-2.5 border-t pt-5">
        {WHAT.map((w) => (
          <li key={w.text} className="text-muted-foreground flex items-start gap-2.5 text-[13px]">
            <w.icon className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
            {w.text}
          </li>
        ))}
      </ul>

      <p className="text-subtle flex items-start gap-2 text-[12.5px]">
        <HelpCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
        ยังไม่มีรหัส หรือจำไม่ได้? ขอจากสำนักงานหอพักได้เลย เขาออกรหัสใหม่ให้ได้ทันที
      </p>
    </main>
  );
}

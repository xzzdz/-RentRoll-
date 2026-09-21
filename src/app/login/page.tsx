import { Building2, Gauge, ReceiptText, Wrench } from "lucide-react";
import { db } from "@/lib/db";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "./LoginForm";

const HIGHLIGHTS = [
  { icon: Building2, title: "ผังห้องที่ตรงกับตึกจริง", desc: "วางทางเดิน บันได ลิฟต์ ได้เอง เห็นห้องว่าง-ค้างชำระในหน้าเดียว" },
  { icon: Gauge, title: "จดมิเตอร์บนมือถือ", desc: "ทีละห้อง เลขครั้งก่อนขึ้นให้ บันทึกอัตโนมัติ เห็นยอดบิลทันที" },
  { icon: ReceiptText, title: "ออกบิลทั้งรอบในคลิกเดียว", desc: "คิดค่าเช่าตามวัน ค่าน้ำ-ไฟ ค่าปรับ พร้อมใบเสร็จเลขรันต่อเนื่อง" },
  { icon: Wrench, title: "งานซ่อมจบในระบบ", desc: "มอบหมายช่าง ติดตามสถานะ ค่าซ่อมเข้าบิลรอบถัดไปให้เอง" },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const property = await db.property.findFirst({ select: { name: true } }).catch(() => null);

  return (
    <main className="min-h-dvh lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* ฝั่งแนะนำระบบ — ซ่อนบนมือถือเพื่อให้ช่องล็อกอินอยู่เหนือพับทันที */}
      <section className="bg-rail text-rail-foreground relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 size-96 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--rail-active), transparent 70%)" }}
        />
        <div className="relative flex items-center gap-2.5">
          <span className="bg-rail-active text-rail font-display grid size-10 place-items-center rounded-xl text-[15px] font-bold">บส</span>
          <b className="font-display text-[17px] font-semibold">{property?.name ?? "ระบบจัดการหอพัก"}</b>
        </div>

        <div className="relative grid gap-5">
          <h1 className="font-display max-w-md text-[28px] leading-tight font-semibold text-balance">
            จัดการหอพักทั้งหอ จบในที่เดียว
          </h1>
          <ul className="grid max-w-md gap-3.5">
            {HIGHLIGHTS.map((h) => (
              <li key={h.title} className="flex gap-3">
                <span className="bg-white/10 grid size-9 shrink-0 place-items-center rounded-lg">
                  <h.icon className="size-[18px]" aria-hidden />
                </span>
                <div>
                  <b className="block text-[14px] font-semibold">{h.title}</b>
                  <span className="text-rail-foreground/70 text-[12.5px] leading-snug">{h.desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-rail-foreground/60 relative text-[12px]">ผู้เช่าเข้าใช้งานผ่าน LINE — ไม่ต้องใช้หน้านี้</p>
      </section>

      {/* ฝั่งล็อกอิน */}
      <section className="grid min-h-dvh place-items-center px-4 py-10 lg:min-h-0">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-2.5">
              <span className="bg-primary text-primary-foreground font-display grid size-10 place-items-center rounded-xl text-[15px] font-bold">บส</span>
              <b className="font-display text-[16px] leading-tight font-semibold">{property?.name ?? "ระบบจัดการหอพัก"}</b>
            </div>
            <ThemeToggle />
          </div>

          <Card className="animate-rise shadow-[var(--shadow-lift)]">
            <CardContent className="grid gap-5">
              <div className="grid gap-1">
                <h2 className="font-display text-xl font-semibold">เข้าสู่ระบบ</h2>
                <p className="text-muted-foreground text-[13px]">สำหรับเจ้าของหอและช่าง</p>
              </div>
              <LoginForm next={next} />
            </CardContent>
          </Card>

          <div className="mt-4 hidden justify-center lg:flex">
            <ThemeToggle showLabel />
          </div>
        </div>
      </section>
    </main>
  );
}

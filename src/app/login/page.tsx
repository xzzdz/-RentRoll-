import { Building2, Gauge, ReceiptText, Wrench } from "lucide-react";
import { db } from "@/lib/db";
import { LoginForm } from "./LoginForm";

const HIGHLIGHTS = [
  { icon: Building2, title: "ผังห้องที่ตรงกับตึกจริง", desc: "วางทางเดิน บันได ลิฟต์ ได้เอง เห็นห้องว่างและห้องค้างชำระในหน้าเดียว" },
  { icon: Gauge, title: "จดมิเตอร์บนมือถือ", desc: "ทีละห้อง เลขครั้งก่อนขึ้นให้ บันทึกอัตโนมัติ เห็นยอดบิลทันที" },
  { icon: ReceiptText, title: "ออกบิลทั้งรอบในคลิกเดียว", desc: "คิดค่าเช่าตามวัน ค่าน้ำ-ไฟ ค่าปรับ พร้อมใบเสร็จเลขรันต่อเนื่อง" },
  { icon: Wrench, title: "งานซ่อมจบในระบบ", desc: "มอบหมายช่าง ติดตามสถานะ ค่าซ่อมเข้าบิลรอบถัดไปให้เอง" },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const property = await db.property.findFirst({ select: { name: true } }).catch(() => null);

  return (
    <main className="mx-auto grid min-h-dvh max-w-5xl items-center gap-12 px-6 py-12 lg:grid-cols-2 lg:gap-16">
      {/* ฝั่งแนะนำระบบ — ซ่อนบนมือถือเพื่อให้ช่องล็อกอินอยู่เหนือพับทันที */}
      <section className="hidden lg:block">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="bg-primary text-primary-foreground font-display grid size-9 place-items-center rounded-lg text-[14px] font-bold">บส</span>
          <b className="font-display text-[16px] font-semibold">{property?.name ?? "ระบบจัดการหอพัก"}</b>
        </div>

        <h1 className="font-display mb-8 max-w-sm text-[30px] leading-tight font-semibold text-balance">จัดการหอพักทั้งหอ จบในที่เดียว</h1>

        <ul className="grid max-w-sm gap-5">
          {HIGHLIGHTS.map((h) => (
            <li key={h.title} className="flex gap-3">
              <h.icon className="text-primary mt-0.5 size-[18px] shrink-0" aria-hidden />
              <div>
                <b className="block text-[14px] font-semibold">{h.title}</b>
                <span className="text-muted-foreground text-[12.5px] leading-snug">{h.desc}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ฝั่งล็อกอิน */}
      <section className="w-full max-w-sm justify-self-center lg:justify-self-end">
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <span className="bg-primary text-primary-foreground font-display grid size-9 place-items-center rounded-lg text-[14px] font-bold">บส</span>
          <b className="font-display text-[15px] leading-tight font-semibold">{property?.name ?? "ระบบจัดการหอพัก"}</b>
        </div>

        <div className="mb-5 grid gap-1">
          <h2 className="font-display text-xl font-semibold">เข้าสู่ระบบ</h2>
          <p className="text-muted-foreground text-[13px]">สำหรับเจ้าของหอและช่าง · ผู้เช่าเข้าใช้งานผ่าน LINE</p>
        </div>

        <LoginForm next={next} />
      </section>
    </main>
  );
}

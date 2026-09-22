import Link from "next/link";
import { ArrowRight, Building2, Check, FileSignature, Gauge, LayoutGrid, ReceiptText } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { BRAND } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "เริ่มต้นใช้งาน" };

export default async function WelcomePage() {
  const session = await requireRole("OWNER");
  const propertyId = session.propertyId;

  const [property, buildings, rooms, contracts] = await Promise.all([
    db.property.findUniqueOrThrow({ where: { id: propertyId }, select: { name: true } }),
    db.building.count({ where: { propertyId } }),
    db.room.count({ where: { building: { propertyId } } }),
    db.contract.count({ where: { room: { building: { propertyId } } } }),
  ]);

  const steps = [
    {
      done: buildings > 0,
      icon: Building2,
      title: "เพิ่มตึก",
      desc: "บอกระบบว่าหอมีกี่ตึก ตึกละกี่ชั้น",
      href: "/buildings",
      cta: buildings > 0 ? `มี ${buildings} ตึกแล้ว` : "เพิ่มตึกแรก",
    },
    {
      done: rooms > 0,
      icon: LayoutGrid,
      title: "สร้างห้อง",
      desc: "ตั้งรูปแบบเลขห้องครั้งเดียว ระบบสร้างให้ทุกชั้นพร้อมมิเตอร์",
      href: buildings > 0 ? "/buildings" : "/buildings",
      cta: rooms > 0 ? `มี ${rooms} ห้องแล้ว` : "สร้างห้องเป็นชุด",
    },
    {
      done: contracts > 0,
      icon: FileSignature,
      title: "รับผู้เช่าคนแรก",
      desc: "ทำสัญญา จดเลขมิเตอร์ตั้งต้น แล้วระบบจะออกบิลให้เองทุกเดือน",
      href: "/contracts/new",
      cta: contracts > 0 ? `มี ${contracts} สัญญาแล้ว` : "ทำสัญญาแรก",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 grid gap-1.5">
        <span className="eyebrow">ยินดีต้อนรับสู่ {BRAND.name}</span>
        <h1 className="font-display text-[24px] leading-tight font-semibold text-balance">
          {allDone ? `${property.name} พร้อมใช้งานแล้ว` : `ตั้งค่า ${property.name} อีกนิดเดียว`}
        </h1>
        <p className="text-muted-foreground text-[13.5px]">
          {allDone ? "ทุกอย่างพร้อมแล้ว เข้าหน้าภาพรวมเพื่อเริ่มจัดการได้เลย" : `ทำครบ ${doneCount} จาก ${steps.length} ขั้น ใช้เวลาไม่กี่นาที`}
        </p>
      </div>

      <div className="bg-muted mb-5 h-2 overflow-hidden rounded-full">
        <i className="bg-primary block h-full rounded-full transition-[width] duration-300" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>

      <div className="grid gap-3">
        {steps.map((s, i) => (
          <Card key={s.title} className={cn(s.done && "border-room-live-bd bg-room-live/40")}>
            <CardContent className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  "font-display grid size-9 shrink-0 place-items-center rounded-full text-[14px] font-bold",
                  s.done ? "bg-room-live-bd text-room-live-fg" : "bg-muted text-muted-foreground",
                )}
              >
                {s.done ? <Check className="size-4.5" aria-label="เสร็จแล้ว" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <b className="font-display text-[15px]">{s.title}</b>
                <p className="text-muted-foreground text-[12.5px] leading-snug">{s.desc}</p>
              </div>
              <Button variant={s.done ? "ghost" : "default"} size="sm" asChild>
                <Link href={s.href}>
                  {s.cta} {!s.done && <ArrowRight />}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-2">
        <span className="eyebrow">ควรตรวจก่อนออกบิลจริง</span>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="outline" className="h-auto justify-start py-2.5" asChild>
            <Link href="/settings/rates">
              <Gauge className="shrink-0" />
              <span className="grid text-left">
                <span className="text-[13.5px] font-semibold">อัตราค่าน้ำ-ค่าไฟ</span>
                <span className="text-subtle text-[11.5px]">ตั้งต้นให้ที่ 18 และ 8 บาท/หน่วย</span>
              </span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto justify-start py-2.5" asChild>
            <Link href="/settings/billing">
              <ReceiptText className="shrink-0" />
              <span className="grid text-left">
                <span className="text-[13.5px] font-semibold">รอบบิลและค่าปรับ</span>
                <span className="text-subtle text-[11.5px]">ตั้งต้นออกบิลวันที่ 25 ครบกำหนดวันที่ 5</span>
              </span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 flex justify-end border-t pt-4">
        <Button variant={allDone ? "default" : "outline"} asChild>
          <Link href="/dashboard">
            ไปหน้าภาพรวม <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { currentTenant } from "@/lib/tenant-auth";
import { CATEGORIES } from "@/lib/maintenance";
import { NewRepairForm } from "../NewRepairForm";

export const metadata = { title: "แจ้งซ่อม" };

export default async function NewRepairPage() {
  const t = await currentTenant();
  if (!t.isActive) redirect("/t/repairs");

  return (
    <div className="grid gap-4">
      <Link href="/t/repairs" className="text-muted-foreground inline-flex items-center gap-1 text-sm hover:underline">
        <ChevronLeft className="size-4" /> งานซ่อมของฉัน
      </Link>
      <div className="grid gap-0.5">
        <h1 className="font-display text-xl font-semibold">แจ้งซ่อม</h1>
        <p className="text-muted-foreground text-[13px]">
          ห้อง <span className="num">{t.room.number}</span> · {t.building.name} — ทางหอจะได้รับเรื่องทันทีที่กดส่ง
        </p>
      </div>
      {/* CATEGORIES ส่งเข้ามาเป็น prop เพราะฝั่ง client import ไฟล์ที่แตะฐานข้อมูลไม่ได้ */}
      <NewRepairForm categories={CATEGORIES} roomNumber={t.room.number} />
    </div>
  );
}

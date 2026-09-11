import { LogOut } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { thDate } from "@/lib/format";
import { logout } from "@/app/login/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const STATUS_TH = { NEW: "แจ้งใหม่", ASSIGNED: "มอบหมายแล้ว", IN_PROGRESS: "กำลังซ่อม", DONE: "เสร็จแล้ว", CANCELLED: "ยกเลิก" } as const;

// หน้าช่าง (ตอนนี้ดูรายการงาน) — อัปเดตสถานะ/ปิดงานจะเพิ่มในเฟสแจ้งซ่อม
export default async function TechPage() {
  const s = await requireRole("TECHNICIAN", "OWNER");
  const jobs = await db.maintenanceRequest.findMany({
    where: { assignedToId: s.userId, status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    include: { room: true },
  });

  return (
    <main className="mx-auto grid max-w-md gap-3 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold">งานของ{s.name}</h1>
        <form action={logout}>
          <Button variant="outline" size="sm" type="submit">
            <LogOut /> ออก
          </Button>
        </form>
      </div>
      {jobs.length === 0 && <p className="bg-card text-muted-foreground rounded-xl border p-4">ยังไม่มีงานที่ได้รับมอบหมาย</p>}
      {jobs.map((j) => (
        <Card key={j.id} className={j.priority === "URGENT" ? "shadow-[inset_3px_0_0_var(--destructive)]" : ""}>
          <CardContent className="grid gap-1">
            <div className="flex items-center justify-between">
              <b className="font-display text-lg">{j.room.number}</b>
              <Badge variant={j.status === "IN_PROGRESS" ? "warn" : "info"}>{STATUS_TH[j.status]}</Badge>
            </div>
            <span>{j.title}</span>
            <span className="text-subtle text-xs">
              {j.category} · {j.ticketNo} · {thDate(j.createdAt)}
              {j.preferredTime ? ` · ${j.preferredTime}` : ""}
            </span>
          </CardContent>
        </Card>
      ))}
    </main>
  );
}

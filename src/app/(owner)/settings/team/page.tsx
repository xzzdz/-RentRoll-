import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { thDateTime } from "@/lib/format";
import { PageHead } from "@/components/PageHead";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AddTechnicianForm } from "./AddTechnicianForm";
import { UserActions } from "./UserActions";

export default async function TeamSettingsPage() {
  const session = await requireRole("OWNER");
  const users = await db.user.findMany({
    where: { role: { in: ["OWNER", "TECHNICIAN"] } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: { _count: { select: { assignedJobs: { where: { status: { in: ["ASSIGNED", "IN_PROGRESS"] } } } } } },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHead title="ผู้ใช้และช่าง" sub="บัญชีที่เข้าระบบได้ · ช่างล็อกอินด้วยเบอร์โทรและเห็นเฉพาะงานที่ได้รับมอบหมาย" />

      <div className="grid gap-3">
        <AddTechnicianForm />

        {users.map((u) => (
          <Card key={u.id} className={u.isActive ? "" : "opacity-60"}>
            <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="min-w-0 flex-1">
                <b className="font-display text-[15px]">{u.name}</b>
                {u.id === session.userId && <span className="text-subtle text-[12px]"> · คุณ</span>}
                <div className="text-subtle num text-[12px]">{u.phone ?? u.email ?? "—"}</div>
              </div>
              {u._count.assignedJobs > 0 && <Badge variant="warn">งานค้าง {u._count.assignedJobs}</Badge>}
              <Badge variant={u.role === "OWNER" ? "info" : "muted"}>{u.role === "OWNER" ? "เจ้าของ" : "ช่าง"}</Badge>
              {!u.isActive && <Badge variant="bad">ปิดใช้งาน</Badge>}
              {u.id !== session.userId && <UserActions user={{ id: u.id, name: u.name, isActive: u.isActive }} />}
            </CardContent>
          </Card>
        ))}

        <p className="text-subtle px-1 text-[12px]">
          บัญชีเจ้าของสร้างจากการ seed ตอนติดตั้ง · อัปเดตล่าสุด {thDateTime(users[0]?.updatedAt ?? new Date())}
        </p>
      </div>
    </div>
  );
}

import { Megaphone, Pin } from "lucide-react";
import { db } from "@/lib/db";
import { currentTenant } from "@/lib/tenant-auth";
import { bangkokToday } from "@/lib/period";
import { thDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "ประกาศจากหอ" };

export default async function TenantAnnouncementsPage() {
  const t = await currentTenant();
  const today = bangkokToday();

  const news = await db.announcement.findMany({
    where: {
      propertyId: t.propertyId,
      // ฉบับร่างและที่ตั้งเวลาไว้ล่วงหน้า ยังไม่ต้องให้ผู้เช่าเห็น
      publishedAt: { not: null, lte: new Date() },
      OR: [{ buildingId: null }, { buildingId: t.building.id }],
      AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gte: today } }] }],
    },
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
    take: 40,
    select: { id: true, title: true, body: true, pinned: true, publishedAt: true, buildingId: true },
  });

  return (
    <div className="grid gap-4">
      <div className="grid gap-0.5">
        <h1 className="font-display text-xl font-semibold">ประกาศจากหอ</h1>
        <p className="text-muted-foreground text-[13px]">ข่าวถึงทุกห้อง และข่าวเฉพาะ{t.building.name}</p>
      </div>

      {news.length === 0 ? (
        <div className="bg-card grid justify-items-center gap-2 rounded-xl border border-dashed p-10 text-center">
          <Megaphone className="text-subtle size-7" aria-hidden />
          <p className="text-muted-foreground text-[13.5px]">ยังไม่มีประกาศ</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {news.map((n) => (
            <Card key={n.id} className={cn(n.pinned && "border-primary/40")}>
              <CardContent className="grid gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <b className="font-display text-[15px] leading-snug">{n.title}</b>
                  {n.pinned && (
                    <Badge variant="info" className="shrink-0">
                      <Pin className="size-3" aria-hidden /> ปักหมุด
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-[13.5px] leading-relaxed whitespace-pre-line">{n.body}</p>
                <span className="text-subtle text-xs">
                  {n.publishedAt ? thDate(n.publishedAt) : ""}
                  {n.buildingId ? ` · เฉพาะ${t.building.name}` : " · ถึงทุกตึก"}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

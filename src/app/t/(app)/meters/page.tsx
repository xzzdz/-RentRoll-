import { Droplets, Gauge, Zap } from "lucide-react";
import { db } from "@/lib/db";
import { currentTenant } from "@/lib/tenant-auth";
import { thPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "มิเตอร์น้ำ-ไฟ" };

type Row = { key: string; period: Date; water: number | null; electric: number | null; waterUsed: number | null; electricUsed: number | null };

export default async function TenantMetersPage() {
  const t = await currentTenant();

  // เอาเลขรายเดือนอย่างเดียว เลขตั้งต้นตอนย้ายเข้าไม่ใช่ "รอบ" ที่ผู้เช่าต้องดู
  const readings = await db.meterReading.findMany({
    where: { meter: { roomId: t.room.id }, isInitial: false },
    orderBy: { periodMonth: "desc" },
    take: 26,
    select: { value: true, periodMonth: true, meter: { select: { utility: true } } },
  });

  // รวมน้ำกับไฟของเดือนเดียวกันเข้าแถวเดียว
  const byPeriod = new Map<string, Row>();
  for (const r of readings) {
    const key = r.periodMonth.toISOString().slice(0, 10);
    const row = byPeriod.get(key) ?? { key, period: r.periodMonth, water: null, electric: null, waterUsed: null, electricUsed: null };
    if (r.meter.utility === "WATER") row.water = r.value.toNumber();
    else row.electric = r.value.toNumber();
    byPeriod.set(key, row);
  }

  // หน่วยที่ใช้ = เลขเดือนนี้ - เลขเดือนก่อน (แถวเรียงจากใหม่ไปเก่า เดือนก่อนจึงอยู่ถัดลงไป)
  const rows = [...byPeriod.values()].sort((a, b) => b.period.getTime() - a.period.getTime());
  for (let i = 0; i < rows.length - 1; i++) {
    const prev = rows[i + 1];
    if (rows[i].water != null && prev.water != null) rows[i].waterUsed = rows[i].water! - prev.water!;
    if (rows[i].electric != null && prev.electric != null) rows[i].electricUsed = rows[i].electric! - prev.electric!;
  }

  const avg = (pick: (r: Row) => number | null) => {
    const xs = rows.map(pick).filter((x): x is number => x != null);
    return xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null;
  };
  const avgWater = avg((r) => r.waterUsed);
  const avgElectric = avg((r) => r.electricUsed);

  return (
    <div className="grid gap-4">
      <div className="grid gap-0.5">
        <h1 className="font-display text-xl font-semibold">มิเตอร์น้ำ-ไฟ</h1>
        <p className="text-muted-foreground text-[13px]">
          ห้อง <span className="num">{t.room.number}</span> · เลขที่ทางหอจดไว้แต่ละรอบ
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="bg-card grid justify-items-center gap-2 rounded-xl border border-dashed p-10 text-center">
          <Gauge className="text-subtle size-7" aria-hidden />
          <p className="text-muted-foreground text-[13.5px]">ยังไม่มีการจดมิเตอร์ของห้องนี้</p>
        </div>
      ) : (
        <>
          {(avgWater != null || avgElectric != null) && (
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="grid gap-0.5">
                  <span className="eyebrow flex items-center gap-1.5">
                    <Droplets className="text-plan-water-fg size-3.5" aria-hidden /> น้ำเฉลี่ย
                  </span>
                  <b className="num font-display text-2xl leading-tight">{avgWater ?? "—"}</b>
                  <span className="text-subtle text-xs">หน่วย/เดือน</span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="grid gap-0.5">
                  <span className="eyebrow flex items-center gap-1.5">
                    <Zap className="text-warn size-3.5" aria-hidden /> ไฟเฉลี่ย
                  </span>
                  <b className="num font-display text-2xl leading-tight">{avgElectric ?? "—"}</b>
                  <span className="text-subtle text-xs">หน่วย/เดือน</span>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardContent className="grid gap-0">
              {rows.map((r, i) => {
                const hotWater = avgWater != null && r.waterUsed != null && r.waterUsed > avgWater * 1.4;
                const hotElectric = avgElectric != null && r.electricUsed != null && r.electricUsed > avgElectric * 1.4;
                return (
                  <div key={r.key} className={cn("grid gap-1 py-2.5", i > 0 && "border-t")}>
                    <b className="font-display text-[14px]">{thPeriod(r.period)}</b>
                    <div className="grid grid-cols-2 gap-3 text-[13px]">
                      <Line
                        icon={<Droplets className="text-plan-water-fg size-3.5 shrink-0" aria-hidden />}
                        reading={r.water}
                        used={r.waterUsed}
                        unit="หน่วยน้ำ"
                        hot={hotWater}
                      />
                      <Line
                        icon={<Zap className="text-warn size-3.5 shrink-0" aria-hidden />}
                        reading={r.electric}
                        used={r.electricUsed}
                        unit="หน่วยไฟ"
                        hot={hotElectric}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <p className="text-subtle text-[12.5px]">
            เลขที่แสดงคือเลขหน้ามิเตอร์ที่จดไว้ · หน่วยที่ใช้คำนวณจากเลขรอบนี้ลบรอบก่อน · รอบแรกสุดยังไม่มีรอบก่อนให้ลบ จึงไม่แสดงหน่วยที่ใช้
          </p>
        </>
      )}
    </div>
  );
}

function Line({ icon, reading, used, unit, hot }: { icon: React.ReactNode; reading: number | null; used: number | null; unit: string; hot?: boolean }) {
  if (reading == null) return <span className="text-subtle flex items-center gap-1.5">{icon} ยังไม่ได้จด</span>;
  return (
    <span className="flex items-baseline gap-1.5">
      {icon}
      <span>
        <b className={cn("num", hot && "text-destructive")}>{used != null ? used.toLocaleString("th-TH") : "—"}</b>
        <span className="text-subtle text-xs"> {unit}</span>
        <span className="num text-subtle block text-[11px]">เลขมิเตอร์ {reading.toLocaleString("th-TH")}</span>
      </span>
    </span>
  );
}

import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

export type BarPoint = { label: string; a: number; b: number; muted?: boolean };

/**
 * แท่งซ้อนรายเดือน — วาดด้วย HTML ล้วน ตัวอักษรจึงไม่ยืดตามความกว้างเหมือน text ใน SVG
 * ค่าทุกแท่งมีป้ายกำกับเสมอ ไม่ต้องเอาเมาส์ชี้ถึงจะอ่านได้
 */
export function BarMonths({
  points,
  labelA,
  labelB,
  unit = "บาท",
}: {
  points: BarPoint[];
  labelA: string;
  labelB: string;
  unit?: string;
}) {
  const max = Math.max(1, ...points.map((p) => p.a + p.b));
  const compact = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)));

  return (
    <figure className="grid gap-3">
      <figcaption className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
        <span className="inline-flex items-center gap-1.5">
          <i className="bg-chart-1 inline-block size-2.5 rounded-[3px]" aria-hidden /> {labelA}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="bg-chart-2 inline-block size-2.5 rounded-[3px]" aria-hidden /> {labelB}
        </span>
      </figcaption>

      <div className="grid grid-flow-col auto-cols-fr items-end gap-2" style={{ height: "168px" }}>
        {points.map((p) => {
          const total = p.a + p.b;
          const pa = (p.a / max) * 100;
          const pb = (p.b / max) * 100;
          return (
            <div key={p.label} className="grid h-full grid-rows-[auto_1fr] gap-1">
              <span className={cn("num text-center text-[11px] leading-none", p.muted ? "text-subtle" : "text-muted-foreground")}>
                {total > 0 ? compact(total) : "—"}
              </span>
              <div className="flex flex-col justify-end gap-[2px]">
                {/* ค้าง (บน) */}
                {pb > 0 && (
                  <div
                    className="bg-chart-2 rounded-t-[4px]"
                    style={{ height: `${pb}%`, minHeight: "3px" }}
                    title={`${p.label} · ${labelB} ${money(p.b, 0)} ${unit}`}
                  />
                )}
                {/* เก็บได้ (ล่าง ติดเส้นฐาน) */}
                <div
                  className={cn("bg-chart-1", pb > 0 ? "rounded-b-[4px]" : "rounded-[4px]")}
                  style={{ height: `${pa}%`, minHeight: p.a > 0 ? "3px" : "0" }}
                  title={`${p.label} · ${labelA} ${money(p.a, 0)} ${unit}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-border grid grid-flow-col auto-cols-fr gap-2 border-t pt-1.5">
        {points.map((p) => (
          <span key={p.label} className={cn("text-center text-[11px]", p.muted ? "text-subtle" : "text-muted-foreground")}>
            {p.label}
          </span>
        ))}
      </div>
    </figure>
  );
}

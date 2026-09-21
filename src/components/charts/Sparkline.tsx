import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * เส้นแนวโน้มชุดเดียว — หัวข้อเป็นตัวบอกว่าเส้นนี้คืออะไร จึงไม่ต้องมี legend
 * ค่าล่าสุดกำกับเป็นตัวเลขไว้ข้างบน ไม่ต้องพึ่งการเอาเมาส์ชี้
 */
export function Sparkline({
  title,
  points,
  labels,
  unit,
  decimals = 0,
  tone = "chart-1",
}: {
  title: string;
  points: number[];
  labels: string[];
  unit: string;
  decimals?: number;
  tone?: "chart-1" | "chart-2" | "chart-3";
}) {
  const W = 300;
  const H = 88;
  const pad = 6;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = max - min || 1;
  const x = (i: number) => (points.length < 2 ? W / 2 : pad + (i * (W - pad * 2)) / (points.length - 1));
  const y = (v: number) => H - pad - ((v - min) / span) * (H - pad * 2);

  const line = points.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`;
  const last = points[points.length - 1] ?? 0;
  const first = points[0] ?? 0;
  const diff = last - first;

  return (
    <figure className="grid gap-1.5">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-muted-foreground text-[12.5px]">{title}</span>
        <span className="flex items-baseline gap-1.5">
          <b className="num font-display text-[17px] font-semibold">{money(last, decimals)}</b>
          <span className="text-subtle text-[11px]">{unit}</span>
        </span>
      </figcaption>

      <svg viewBox={`0 0 ${W} ${H}`} className="h-[88px] w-full" role="img" aria-label={`${title} ${points.map((p, i) => `${labels[i]} ${p}`).join(", ")}`}>
        <path d={area} className={cn("fill-current opacity-10", tone === "chart-1" ? "text-chart-1" : tone === "chart-2" ? "text-chart-2" : "text-chart-3")} />
        <path
          d={line}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className={cn("stroke-current", tone === "chart-1" ? "text-chart-1" : tone === "chart-2" ? "text-chart-2" : "text-chart-3")}
        />
        {points.map((v, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(v)}
            r={i === points.length - 1 ? 4 : 2.5}
            className={cn("fill-current", tone === "chart-1" ? "text-chart-1" : tone === "chart-2" ? "text-chart-2" : "text-chart-3")}
          >
            <title>{`${labels[i]}: ${money(v, decimals)} ${unit}`}</title>
          </circle>
        ))}
      </svg>

      <div className="text-subtle flex justify-between text-[11px]">
        <span>{labels[0]}</span>
        <span className={cn(diff > 0 && "text-warn", diff < 0 && "text-ok")}>
          {diff === 0 ? "เท่าเดิม" : `${diff > 0 ? "+" : "−"}${money(Math.abs(diff), decimals)} จากต้นช่วง`}
        </span>
        <span>{labels[labels.length - 1]}</span>
      </div>
    </figure>
  );
}

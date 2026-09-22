import { ArrowUpDown, Bath, DoorOpen } from "lucide-react";
import { CELL_META, type CellIconName, type PlanCellType } from "@/lib/floorplan";
import { cn } from "@/lib/utils";

/** lucide ไม่มีไอคอนบันได วาดเองเป็นขั้นสามขั้น อ่านออกตั้งแต่ 12px */
function StairsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={cn("size-4", className)}>
      <path
        d="M2 13h4V9.5h4V6h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6 13V9.5M10 9.5V6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function CellIcon({ name, className }: { name: CellIconName; className?: string }) {
  if (name === "stairs") return <StairsIcon className={className} />;
  if (name === "elevator") return <ArrowUpDown aria-hidden className={cn("size-3.5", className)} />;
  if (name === "door") return <DoorOpen aria-hidden className={cn("size-4", className)} />;
  if (name === "bath") return <Bath aria-hidden className={cn("size-3.5", className)} />;
  return null;
}

/**
 * เนื้อในของช่องที่ไม่ใช่ห้อง — ไอคอน + ป้ายสั้น ๆ
 * ป้ายจะถูกซ่อนเมื่อช่องเล็กเกินไป แต่ไอคอนยังอยู่ จึงไม่มีจุดไหนที่อ่านไม่ออก
 */
export function CellContent({ type, compact = false }: { type: PlanCellType; compact?: boolean }) {
  const meta = CELL_META[type];
  if (!meta.icon && !meta.short) return null;

  return (
    <span className="grid justify-items-center gap-0.5 leading-none">
      <CellIcon name={meta.icon} />
      {meta.short && !compact && <span className="text-[8.5px] font-medium">{meta.short}</span>}
    </span>
  );
}

/** คำอธิบายสัญลักษณ์ของพื้นที่ส่วนกลาง ใช้ร่วมกันทั้งหน้าผังห้องและหน้าจัดผัง */
export function PlanLegend({ className }: { className?: string }) {
  const types: PlanCellType[] = ["CORRIDOR", "STAIRS", "ELEVATOR", "ENTRANCE", "WC"];
  return (
    <div className={cn("text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px]", className)}>
      {types.map((t) => (
        <span key={t} className="inline-flex items-center gap-1.5">
          <span className={cn("grid size-5 place-items-center rounded border", CELL_META[t].className)}>
            <CellIcon name={CELL_META[t].icon} className="size-3" />
          </span>
          {CELL_META[t].label}
        </span>
      ))}
    </div>
  );
}

import { cn } from "@/lib/utils";

/** กล่องเทาไว้จองที่ระหว่างโหลด — ต้องมีขนาดเท่าของจริง ไม่งั้นหน้ากระตุกตอนข้อมูลมา */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("bg-muted animate-[pulse-soft_1.4s_ease-in-out_infinite] rounded-lg", className)} />;
}

/** โครงหน้าแบบมาตรฐาน: หัวข้อ + แถว KPI + กล่องเนื้อหา */
export function PageSkeleton({ kpis = 4, rows = 6 }: { kpis?: number; rows?: number }) {
  return (
    <div role="status" aria-label="กำลังโหลด" className="grid gap-4">
      <div className="grid gap-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-64" />
      </div>
      {kpis > 0 && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
          {Array.from({ length: kpis }).map((_, i) => (
            <Skeleton key={i} className="h-[86px]" />
          ))}
        </div>
      )}
      <div className="bg-card grid gap-2 rounded-xl border p-4">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    </div>
  );
}

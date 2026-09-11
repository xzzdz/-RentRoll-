import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** label + control + ข้อความช่วย/หน่วย */
export function Field({
  id,
  label,
  hint,
  unit,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  unit?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id} className="text-muted-foreground text-[12.5px] font-semibold">
        {label}
      </Label>
      <div className="relative">
        {children}
        {unit && <span className="text-subtle pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs">{unit}</span>}
      </div>
      {hint && <p className="text-subtle text-xs">{hint}</p>}
    </div>
  );
}

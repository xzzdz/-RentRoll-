import Link from "next/link";
import { cn } from "@/lib/utils";

export function BuildingTabs({ buildings, current, basePath }: { buildings: { id: string; name: string }[]; current: string; basePath: string }) {
  return (
    <nav className="bg-muted inline-flex flex-wrap gap-0.5 rounded-lg p-[3px]" aria-label="เลือกตึก">
      {buildings.map((b) => (
        <Link
          key={b.id}
          aria-current={b.id === current ? "page" : undefined}
          href={`${basePath}?b=${b.id}`}
          className={cn(
            "rounded-md px-3 py-1 font-display text-sm font-semibold",
            b.id === current ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {b.name}
        </Link>
      ))}
    </nav>
  );
}

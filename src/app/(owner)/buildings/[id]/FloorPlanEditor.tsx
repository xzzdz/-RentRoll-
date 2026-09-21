"use client";

import { useRef, useState } from "react";
import { Columns3, Eraser, Minus, Plus, Rows3, Save } from "lucide-react";
import {
  CELL_META,
  MAX_CELLS,
  MAX_COLS,
  MIN_COLS,
  PAINT_TOOLS,
  emptyCells,
  resizeCols,
  rowsOf,
  type FloorPlan,
  type PlanCell,
  type PlanCellType,
} from "@/lib/floorplan";
import { cn } from "@/lib/utils";
import { SubmitButton } from "@/components/SubmitButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { saveFloorPlan } from "../actions";
import type { RoomView } from "./RoomList";

type Tool = { kind: "paint"; t: PlanCellType } | { kind: "room"; roomId: string };

export function FloorPlanEditor({
  buildingId,
  floors,
  rooms,
  initialPlan,
}: {
  buildingId: string;
  floors: number[];
  rooms: RoomView[];
  initialPlan: FloorPlan;
}) {
  const [plan, setPlan] = useState<FloorPlan>(initialPlan);
  const [floor, setFloor] = useState(floors[0] ?? 1);
  const [tool, setTool] = useState<Tool>({ kind: "paint", t: "CORRIDOR" });
  const [dirty, setDirty] = useState(false);
  const painting = useRef(false);

  const key = String(floor);
  const cells = plan.floors[key] ?? emptyCells(plan.cols * 3);
  const rows = rowsOf(cells, plan.cols);
  const floorRooms = rooms.filter((r) => r.floor === floor);
  const placed = new Set(cells.filter((c) => c.t === "ROOM" && c.roomId).map((c) => c.roomId!));
  const unplaced = floorRooms.filter((r) => !placed.has(r.id));
  const roomById = new Map(rooms.map((r) => [r.id, r]));

  function update(next: PlanCell[]) {
    setPlan((p) => ({ ...p, floors: { ...p.floors, [key]: next } }));
    setDirty(true);
  }

  function paint(index: number) {
    const next = [...cells];
    if (tool.kind === "paint") {
      next[index] = { t: tool.t };
    } else {
      // ห้องหนึ่งอยู่ได้ที่เดียว — ถ้าเคยวางไว้แล้วให้ย้ายมาช่องใหม่
      for (let i = 0; i < next.length; i++) if (next[i].t === "ROOM" && next[i].roomId === tool.roomId) next[i] = { t: "EMPTY" };
      next[index] = { t: "ROOM", roomId: tool.roomId };
    }
    update(next);
    // วางห้องเสร็จแล้วเด้งไปห้องถัดไปเอง จะได้วางรัวได้
    if (tool.kind === "room") {
      const rest = floorRooms.filter((r) => r.id !== tool.roomId && !placed.has(r.id));
      setTool(rest.length ? { kind: "room", roomId: rest[0].id } : { kind: "paint", t: "CORRIDOR" });
    }
  }

  function setCols(delta: number) {
    const to = Math.min(MAX_COLS, Math.max(MIN_COLS, plan.cols + delta));
    if (to === plan.cols) return;
    const floorsNext: Record<string, PlanCell[]> = {};
    for (const [k, c] of Object.entries(plan.floors)) floorsNext[k] = resizeCols(c, plan.cols, to);
    setPlan({ cols: to, floors: floorsNext });
    setDirty(true);
  }

  function setRows(delta: number) {
    const next = rows + delta;
    if (next < 1 || next * plan.cols > MAX_CELLS) return;
    update(delta > 0 ? [...cells, ...emptyCells(plan.cols)] : cells.slice(0, next * plan.cols));
  }

  /** ระบายต่อเนื่องด้วยเมาส์ได้ ส่วนมือถือแตะทีละช่อง (ไม่งั้นจะเลื่อนหน้าจอไม่ได้) */
  function onPointerDown(e: React.PointerEvent, i: number) {
    paint(i);
    if (e.pointerType === "mouse") painting.current = true;
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>ผังชั้น</CardTitle>
          <CardDescription>
            เลือกเครื่องมือหรือเลือกห้อง แล้วแตะช่องในตาราง · บนคอมพิวเตอร์ลากค้างเพื่อระบายยาว ๆ ได้
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {/* เลือกชั้น */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="eyebrow mr-1">ชั้น</span>
            {floors.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFloor(f)}
                aria-current={f === floor ? "true" : undefined}
                className={cn(
                  "num min-h-9 min-w-9 rounded-lg border px-2.5 text-[13px] font-semibold",
                  f === floor ? "bg-primary text-primary-foreground border-transparent" : "bg-card hover:bg-muted",
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {/* เครื่องมือ */}
          <div className="flex flex-wrap gap-1.5">
            {PAINT_TOOLS.map((t) => {
              const on = tool.kind === "paint" && tool.t === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTool({ kind: "paint", t })}
                  aria-pressed={on}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium",
                    on ? "border-primary ring-primary/30 ring-2" : "hover:bg-muted",
                    t === "EMPTY" ? "border-dashed" : CELL_META[t].className,
                  )}
                >
                  {t === "EMPTY" && <Eraser className="size-3.5" aria-hidden />}
                  {CELL_META[t].label}
                </button>
              );
            })}
          </div>

          {/* ห้องที่ยังไม่ได้วาง */}
          <div className="grid gap-1.5">
            <span className="eyebrow">
              ห้องชั้น {floor} ที่ยังไม่ได้วาง ({unplaced.length}/{floorRooms.length})
            </span>
            {floorRooms.length === 0 ? (
              <p className="text-subtle text-[12.5px]">ชั้นนี้ยังไม่มีห้อง — สร้างห้องในแท็บ &ldquo;ห้อง&rdquo; ก่อน</p>
            ) : unplaced.length === 0 ? (
              <p className="text-ok text-[12.5px]">วางครบทุกห้องแล้ว</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {unplaced.map((r) => {
                  const on = tool.kind === "room" && tool.roomId === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setTool({ kind: "room", roomId: r.id })}
                      aria-pressed={on}
                      className={cn(
                        "num min-h-9 rounded-lg border px-2.5 text-[13px] font-semibold",
                        on ? "border-primary ring-primary/30 bg-accent text-accent-foreground ring-2" : "bg-card hover:bg-muted",
                      )}
                    >
                      {r.number}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ตาราง */}
          <div
            className="bg-muted/40 overflow-x-auto rounded-xl border p-2"
            onPointerUp={() => (painting.current = false)}
            onPointerLeave={() => (painting.current = false)}
          >
            <div
              className="mx-auto grid gap-1"
              style={{ gridTemplateColumns: `repeat(${plan.cols}, minmax(38px, 1fr))`, maxWidth: `${plan.cols * 76}px` }}
            >
              {cells.map((c, i) => {
                const room = c.t === "ROOM" && c.roomId ? roomById.get(c.roomId) : null;
                return (
                  <button
                    key={i}
                    type="button"
                    onPointerDown={(e) => onPointerDown(e, i)}
                    onPointerEnter={() => painting.current && paint(i)}
                    aria-label={`แถว ${Math.floor(i / plan.cols) + 1} ช่อง ${(i % plan.cols) + 1} — ${room?.number ?? CELL_META[c.t].label}`}
                    className={cn(
                      "grid aspect-square place-items-center rounded-md border text-[10px] leading-tight font-medium select-none",
                      CELL_META[c.t].className,
                      "hover:ring-primary/40 hover:ring-2",
                    )}
                  >
                    {room ? <span className="num text-[11px] font-bold">{room.number}</span> : c.t === "EMPTY" ? "" : CELL_META[c.t].short}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ขนาดตาราง */}
          <div className="flex flex-wrap items-center gap-3 text-[13px]">
            <div className="flex items-center gap-1">
              <Columns3 className="text-subtle size-4" aria-hidden />
              <span className="text-muted-foreground">คอลัมน์</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setCols(-1)} disabled={plan.cols <= MIN_COLS} aria-label="ลดคอลัมน์">
                <Minus />
              </Button>
              <b className="num w-5 text-center">{plan.cols}</b>
              <Button type="button" variant="outline" size="sm" onClick={() => setCols(1)} disabled={plan.cols >= MAX_COLS} aria-label="เพิ่มคอลัมน์">
                <Plus />
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Rows3 className="text-subtle size-4" aria-hidden />
              <span className="text-muted-foreground">แถว</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setRows(-1)} disabled={rows <= 1} aria-label="ลดแถว">
                <Minus />
              </Button>
              <b className="num w-5 text-center">{rows}</b>
              <Button type="button" variant="outline" size="sm" onClick={() => setRows(1)} disabled={(rows + 1) * plan.cols > MAX_CELLS} aria-label="เพิ่มแถว">
                <Plus />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <form action={saveFloorPlan} className="bg-card/80 sticky bottom-20 flex items-center justify-between gap-3 rounded-xl border p-3 backdrop-blur lg:bottom-4">
        <input type="hidden" name="buildingId" value={buildingId} />
        <input type="hidden" name="plan" value={JSON.stringify(plan)} />
        <span className="text-muted-foreground text-[12.5px]">{dirty ? "ยังไม่ได้บันทึก" : "ผังตรงกับที่บันทึกไว้"}</span>
        <SubmitButton disabled={!dirty} pendingText="กำลังบันทึก…">
          <Save /> บันทึกผัง
        </SubmitButton>
      </form>
    </div>
  );
}

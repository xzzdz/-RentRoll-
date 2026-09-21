// ผังแต่ละชั้นของตึก — เก็บเป็น JSON บน Building.floorPlan
// ไฟล์นี้ต้องไม่แตะฐานข้อมูล เพราะตัวแก้ผังฝั่ง client ก็ import ไปใช้

export type PlanCellType = "ROOM" | "CORRIDOR" | "STAIRS" | "ELEVATOR" | "WC" | "EMPTY";

export type PlanCell = { t: PlanCellType; roomId?: string | null };

/** floors: เลขชั้น (เป็น string เพราะเป็น key ของ JSON) → ช่องเรียงจากซ้ายไปขวา บนลงล่าง */
export type FloorPlan = { cols: number; floors: Record<string, PlanCell[]> };

export const MIN_COLS = 3;
export const MAX_COLS = 16;
export const MAX_CELLS = 400;

export const CELL_META: Record<PlanCellType, { label: string; short: string; className: string }> = {
  ROOM: { label: "ห้องพัก", short: "ห้อง", className: "bg-accent text-accent-foreground border-transparent" },
  CORRIDOR: { label: "ทางเดิน", short: "ทางเดิน", className: "bg-muted text-muted-foreground border-transparent" },
  STAIRS: { label: "บันได", short: "บันได", className: "bg-warn-soft text-warn border-transparent" },
  ELEVATOR: { label: "ลิฟต์", short: "ลิฟต์", className: "bg-warn-soft text-warn border-transparent" },
  WC: { label: "ห้องน้ำรวม", short: "ห้องน้ำ", className: "bg-ok-soft text-ok border-transparent" },
  EMPTY: { label: "ว่าง (ไม่ใช่พื้นที่)", short: "—", className: "bg-transparent text-subtle border-dashed" },
};

export const PAINT_TOOLS: PlanCellType[] = ["CORRIDOR", "STAIRS", "ELEVATOR", "WC", "EMPTY"];

const isCellType = (v: unknown): v is PlanCellType => typeof v === "string" && v in CELL_META;

export function emptyCells(count: number): PlanCell[] {
  return Array.from({ length: count }, () => ({ t: "EMPTY" as const }));
}

export function emptyPlan(floors: number[], cols = 8, rows = 3): FloorPlan {
  const out: Record<string, PlanCell[]> = {};
  for (const f of floors) out[String(f)] = emptyCells(cols * rows);
  return { cols, floors: out };
}

/** อ่าน JSON จากฐานข้อมูลแบบระวังตัว — ข้อมูลผิดรูปให้ถือว่ายังไม่มีผัง ดีกว่าทำหน้าพัง */
export function parsePlan(value: unknown): FloorPlan | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const cols = Number(raw.cols);
  if (!Number.isInteger(cols) || cols < MIN_COLS || cols > MAX_COLS) return null;
  if (!raw.floors || typeof raw.floors !== "object" || Array.isArray(raw.floors)) return null;

  const floors: Record<string, PlanCell[]> = {};
  for (const [key, cells] of Object.entries(raw.floors as Record<string, unknown>)) {
    if (!Array.isArray(cells) || cells.length > MAX_CELLS) continue;
    floors[key] = cells.map((c) => {
      const cell = (c ?? {}) as Record<string, unknown>;
      const t = isCellType(cell.t) ? cell.t : "EMPTY";
      const roomId = typeof cell.roomId === "string" ? cell.roomId : null;
      return t === "ROOM" ? { t, roomId } : { t };
    });
  }
  return Object.keys(floors).length ? { cols, floors } : null;
}

/** ตัดห้องที่ถูกลบออกจากระบบแล้วทิ้ง ไม่งั้นผังจะอ้างห้องที่ไม่มีอยู่ */
export function prunePlan(plan: FloorPlan, validRoomIds: Set<string>): FloorPlan {
  const floors: Record<string, PlanCell[]> = {};
  for (const [key, cells] of Object.entries(plan.floors)) {
    floors[key] = cells.map((c) => (c.t === "ROOM" && (!c.roomId || !validRoomIds.has(c.roomId)) ? { t: "EMPTY" as const } : c));
  }
  return { cols: plan.cols, floors };
}

export function rowsOf(cells: PlanCell[], cols: number) {
  return Math.max(1, Math.ceil(cells.length / cols));
}

/** เปลี่ยนจำนวนคอลัมน์โดยรักษาตำแหน่งเดิมของแต่ละช่องไว้ */
export function resizeCols(cells: PlanCell[], from: number, to: number): PlanCell[] {
  const rows = rowsOf(cells, from);
  const out = emptyCells(rows * to);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < Math.min(from, to); c++) {
      const src = cells[r * from + c];
      if (src) out[r * to + c] = src;
    }
  }
  return out;
}

export function placedRoomIds(plan: FloorPlan): Set<string> {
  const ids = new Set<string>();
  for (const cells of Object.values(plan.floors)) {
    for (const c of cells) if (c.t === "ROOM" && c.roomId) ids.add(c.roomId);
  }
  return ids;
}

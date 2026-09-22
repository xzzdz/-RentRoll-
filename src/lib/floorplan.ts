// ผังแต่ละชั้นของตึก — เก็บเป็น JSON บน Building.floorPlan
// ไฟล์นี้ต้องไม่แตะฐานข้อมูล เพราะตัวแก้ผังฝั่ง client ก็ import ไปใช้

export type PlanCellType = "ROOM" | "CORRIDOR" | "STAIRS" | "ENTRANCE" | "ELEVATOR" | "WC" | "EMPTY";

export type PlanCell = { t: PlanCellType; roomId?: string | null };

/** floors: เลขชั้น (เป็น string เพราะเป็น key ของ JSON) → ช่องเรียงจากซ้ายไปขวา บนลงล่าง */
export type FloorPlan = { cols: number; floors: Record<string, PlanCell[]> };

export const MIN_COLS = 3;
export const MAX_COLS = 16;
export const MAX_CELLS = 400;

/** ไอคอนของช่อง — ตัวจริงอยู่ใน components/FloorPlanCell.tsx (ไฟล์นี้ต้องไม่มี JSX) */
export type CellIconName = "stairs" | "elevator" | "door" | "bath" | null;

/**
 * โครงสร้างอาคารใช้ "สีเย็น พื้นจาง" ส่วนห้องใช้ "สีสด พื้นเข้ม"
 * ต่างกันที่ความอิ่มสี ตาจึงแยกสองชั้นนี้ออกก่อนอ่านรายละเอียด
 * และทุกช่องมีไอคอนกำกับ ไม่ได้พึ่งสีอย่างเดียว
 */
export const CELL_META: Record<PlanCellType, { label: string; short: string; icon: CellIconName; className: string }> = {
  ROOM: { label: "ห้องพัก", short: "ห้อง", icon: null, className: "bg-card text-foreground border-border" },
  CORRIDOR: { label: "ทางเดิน", short: "", icon: null, className: "bg-muted text-subtle border-border" },
  STAIRS: { label: "บันได", short: "บันได", icon: "stairs", className: "bg-plan-move text-plan-move-fg border-plan-move-bd" },
  ELEVATOR: { label: "ลิฟต์", short: "ลิฟต์", icon: "elevator", className: "bg-plan-move text-plan-move-fg border-plan-move-bd" },
  WC: { label: "ห้องน้ำรวม", short: "ห้องน้ำ", icon: "bath", className: "bg-plan-water text-plan-water-fg border-plan-water-bd" },
  // ทางเข้า-ออกอยู่ตระกูลเดียวกับบันได/ลิฟต์ (ทางสัญจร) แยกด้วยไอคอนประตูและขอบที่เข้มกว่า
  ENTRANCE: { label: "ทางเข้า-ออก", short: "เข้า-ออก", icon: "door", className: "bg-plan-move text-plan-move-fg border-plan-move-fg/55" },
  EMPTY: { label: "ว่าง (ไม่ใช่พื้นที่)", short: "", icon: null, className: "bg-transparent text-subtle border-dashed border-border" },
};

/** เรียงตามที่ใช้บ่อย — ทางเดินกับบันไดคือสองอย่างที่วาดเยอะสุด */
export const PAINT_TOOLS: PlanCellType[] = ["CORRIDOR", "STAIRS", "ENTRANCE", "ELEVATOR", "WC", "EMPTY"];

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

/** วางห้องที่ยังไม่ได้วาง ลงช่องว่างเรียงจากซ้ายไปขวา บนลงล่าง */
export function autoPlaceRooms(cells: PlanCell[], roomIds: string[]): PlanCell[] {
  const next = [...cells];
  const queue = [...roomIds];
  for (let i = 0; i < next.length && queue.length; i++) {
    if (next[i].t === "EMPTY") next[i] = { t: "ROOM", roomId: queue.shift()! };
  }
  return next;
}

export function placedRoomIds(plan: FloorPlan): Set<string> {
  const ids = new Set<string>();
  for (const cells of Object.values(plan.floors)) {
    for (const c of cells) if (c.t === "ROOM" && c.roomId) ids.add(c.roomId);
  }
  return ids;
}

/* ---------------------------------------------------------------
   การต่อช่องให้เป็นก้อนเดียว
   ผังจริงไม่ได้เป็นช่องสี่เหลี่ยมลอย ๆ เรียงกัน — ทางเดินคือ "ทางเดินเส้นเดียว"
   ที่ยาวต่อกันไป บันไดสองช่องคือบันไดตัวเดียว เราจึงวาดตารางแบบไม่มีช่องไฟ
   แล้วลบเส้นขอบระหว่างช่องชนิดเดียวกันทิ้ง เหลือไว้แต่เส้นที่เป็นผนังจริง
   --------------------------------------------------------------- */

/** ชนิดที่ไหลต่อกันได้ — ห้องไม่อยู่ในนี้ เพราะห้องต้องมีผนังครบสี่ด้านเสมอ */
const MERGING: PlanCellType[] = ["CORRIDOR", "STAIRS", "ELEVATOR", "WC", "ENTRANCE"];

export type Walls = { top: boolean; right: boolean; bottom: boolean; left: boolean };

function typeAt(cells: PlanCell[], cols: number, row: number, col: number): PlanCellType | null {
  if (row < 0 || col < 0 || col >= cols) return null;
  return cells[row * cols + col]?.t ?? null;
}

/** ด้านไหนต้องตีเส้น — true = เป็นผนัง (ติดกับช่องคนละชนิดหรือขอบอาคาร) */
export function wallsOf(cells: PlanCell[], cols: number, i: number): Walls {
  const t = cells[i]?.t ?? "EMPTY";
  const row = Math.floor(i / cols);
  const col = i % cols;
  const joins = (r: number, c: number) => MERGING.includes(t) && typeAt(cells, cols, r, c) === t;
  return {
    top: !joins(row - 1, col),
    right: !joins(row, col + 1),
    bottom: !joins(row + 1, col),
    left: !joins(row, col - 1),
  };
}

/** คลาสความหนาเส้นขอบตามผนัง — ต้องต่อท้ายคลาสสีของช่อง เพื่อให้ทับค่าเดิมได้ */
export function wallClass(w: Walls) {
  return [
    w.top ? "border-t" : "border-t-0",
    w.right ? "border-r" : "border-r-0",
    w.bottom ? "border-b" : "border-b-0",
    w.left ? "border-l" : "border-l-0",
  ].join(" ");
}

/** ทางเดินต่อไปทางไหนบ้าง — ใช้ลากเส้นประกลางทาง ให้เห็นว่าเดินไปไหนได้ */
export function corridorLinks(cells: PlanCell[], cols: number, i: number) {
  if (cells[i]?.t !== "CORRIDOR") return null;
  const row = Math.floor(i / cols);
  const col = i % cols;
  const on = (r: number, c: number) => typeAt(cells, cols, r, c) === "CORRIDOR";
  const links = { up: on(row - 1, col), right: on(row, col + 1), down: on(row + 1, col), left: on(row, col - 1) };
  return links.up || links.right || links.down || links.left ? links : null;
}

export type CorridorLinks = NonNullable<ReturnType<typeof corridorLinks>>;

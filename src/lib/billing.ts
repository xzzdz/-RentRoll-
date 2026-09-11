// กติกาคำนวณบิล — pure functions ใช้ได้ทั้ง server (ออกบิลจริง) และ client (แสดงยอดตอนจดมิเตอร์)

export type RateMode = "PER_UNIT" | "TIERED" | "FLAT";

export type RateConfig = {
  mode: RateMode;
  unitPrice: number | null;
  minimumUnits: number | null;
  minimumCharge: number | null;
  flatAmount: number | null;
  tiers: { fromUnit: number; toUnit: number | null; unitPrice: number }[];
};

export type LateFeeConfig = {
  mode: "NONE" | "FIXED" | "PER_DAY";
  amount: number;
  max: number | null;
  graceDays: number;
};

export const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * หน่วยที่ใช้ — ถ้าเลขใหม่น้อยกว่าเลขเดิมและรู้ค่าสูงสุดของมิเตอร์ ถือว่ามิเตอร์วนรอบ
 * คืน null เมื่อคำนวณไม่ได้ (ต้องให้ผู้ใช้ตรวจ)
 */
export function meterUnits(prev: number, curr: number, maxReading?: number | null): number | null {
  if (curr >= prev) return round2(curr - prev);
  if (maxReading && maxReading > prev) return round2(maxReading + 1 - prev + curr);
  return null;
}

export function utilityCharge(cfg: RateConfig, units: number): { amount: number; note: string } {
  if (cfg.mode === "FLAT") return { amount: round2(cfg.flatAmount ?? 0), note: "เหมาจ่าย" };

  if (cfg.mode === "TIERED") {
    let amount = 0;
    for (const t of [...cfg.tiers].sort((a, b) => a.fromUnit - b.fromUnit)) {
      const top = t.toUnit ?? Infinity;
      const used = Math.max(0, Math.min(units, top) - t.fromUnit);
      amount += used * t.unitPrice;
    }
    const min = cfg.minimumCharge ?? 0;
    return amount < min
      ? { amount: round2(min), note: `ขั้นต่ำ ${min} บาท` }
      : { amount: round2(amount), note: "อัตราขั้นบันได" };
  }

  const billedUnits = Math.max(units, cfg.minimumUnits ?? 0);
  const raw = billedUnits * (cfg.unitPrice ?? 0);
  const min = cfg.minimumCharge ?? 0;
  if (raw < min) return { amount: round2(min), note: `ขั้นต่ำ ${min} บาท` };
  if (billedUnits > units) return { amount: round2(raw), note: `ขั้นต่ำ ${cfg.minimumUnits} หน่วย` };
  return { amount: round2(raw), note: "" };
}

export type LineType = "RENT" | "WATER" | "ELECTRIC" | "FEE" | "LATE_FEE" | "REPAIR" | "DISCOUNT" | "OTHER";

export type InvoiceLine = {
  type: LineType;
  description: string;
  prevReading?: number;
  currReading?: number;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type BillInput = {
  rent: number;
  roomTypeName?: string;
  rentNote?: string; // เช่น "คิด 20/30 วัน"
  water: { prev: number; curr: number; maxReading?: number | null } | null;
  electric: { prev: number; curr: number; maxReading?: number | null } | null;
  rates: { water: RateConfig | null; electric: RateConfig | null };
  fees: { name: string; amount: number }[];
};

function utilityLine(
  type: "WATER" | "ELECTRIC",
  label: string,
  reading: BillInput["water"],
  cfg: RateConfig | null,
): InvoiceLine | null {
  if (!cfg) return null;
  if (cfg.mode === "FLAT") {
    const { amount } = utilityCharge(cfg, 0);
    return { type, description: `${label} (เหมาจ่าย)`, quantity: 1, unitPrice: amount, amount };
  }
  if (!reading) return null;
  const units = meterUnits(reading.prev, reading.curr, reading.maxReading);
  if (units === null) return null;
  const { amount, note } = utilityCharge(cfg, units);
  return {
    type,
    description: note ? `${label} · ${note}` : label,
    prevReading: reading.prev,
    currReading: reading.curr,
    quantity: units,
    unitPrice: cfg.mode === "PER_UNIT" ? cfg.unitPrice ?? 0 : round2(units ? amount / units : 0),
    amount,
  };
}

/** คืน null ถ้ายังคำนวณไม่ได้ (ยังไม่จดมิเตอร์หรือเลขผิดปกติ) */
export function buildBill(input: BillInput): { lines: InvoiceLine[]; total: number } | null {
  const lines: InvoiceLine[] = [
    {
      type: "RENT",
      description:
        (input.roomTypeName ? `ค่าเช่าห้อง (${input.roomTypeName})` : "ค่าเช่าห้อง") + (input.rentNote ? ` · ${input.rentNote}` : ""),
      quantity: 1,
      unitPrice: input.rent,
      amount: input.rent,
    },
  ];
  const w = utilityLine("WATER", "ค่าน้ำประปา", input.water, input.rates.water);
  const e = utilityLine("ELECTRIC", "ค่าไฟฟ้า", input.electric, input.rates.electric);
  if ((input.rates.water && !w) || (input.rates.electric && !e)) return null;
  if (w) lines.push(w);
  if (e) lines.push(e);
  for (const f of input.fees) {
    lines.push({ type: "FEE", description: f.name, quantity: 1, unitPrice: f.amount, amount: f.amount });
  }
  return { lines, total: round2(lines.reduce((s, l) => s + l.amount, 0)) };
}

/** ค่าปรับ ณ วันที่ today สำหรับบิลที่ครบกำหนด dueDate */
export function lateFee(cfg: LateFeeConfig, dueDate: Date, today: Date): { days: number; amount: number } {
  const days = Math.floor((today.getTime() - dueDate.getTime()) / 86_400_000) - cfg.graceDays;
  if (days <= 0 || cfg.mode === "NONE") return { days: Math.max(0, days), amount: 0 };
  if (cfg.mode === "FIXED") return { days, amount: cfg.amount };
  return { days, amount: Math.min(days * cfg.amount, cfg.max ?? Infinity) };
}

/** ค่าเช่าตามจำนวนวันที่อยู่จริงในเดือน (เข้า/ออกกลางเดือน) */
export function proratedRent(
  rent: number,
  period: Date,
  startDate: Date,
  moveOutDate: Date | null,
  prorate: boolean,
): { amount: number; note: string } {
  const y = period.getUTCFullYear();
  const m = period.getUTCMonth();
  const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const inPeriod = (d: Date) => d.getUTCFullYear() === y && d.getUTCMonth() === m;
  const from = inPeriod(startDate) ? startDate.getUTCDate() : 1;
  const to = moveOutDate && inPeriod(moveOutDate) ? moveOutDate.getUTCDate() : dim;
  if (!prorate || (from === 1 && to === dim)) return { amount: rent, note: "" };
  const days = Math.max(0, to - from + 1);
  return { amount: round2((rent * days) / dim), note: `คิด ${days}/${dim} วัน` };
}

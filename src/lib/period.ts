// วันที่ทั้งหมดในระบบคิดตามเวลาไทย (UTC+7) และเก็บเป็น @db.Date (UTC เที่ยงคืน)

export function bangkokToday(): Date {
  const n = new Date(Date.now() + 7 * 3600_000);
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

/** วันที่ 1 ของเดือนรอบบิล */
export function periodOf(d: Date = bangkokToday()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function addMonths(period: Date, n: number): Date {
  return new Date(Date.UTC(period.getUTCFullYear(), period.getUTCMonth() + n, 1));
}

export function sameDay(a: Date, b: Date) {
  return a.getTime() === b.getTime();
}

/** "202609" ใช้ในเลขที่เอกสาร */
export function periodKey(period: Date) {
  return `${period.getUTCFullYear()}${String(period.getUTCMonth() + 1).padStart(2, "0")}`;
}

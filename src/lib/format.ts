const TH_MONTH_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const TH_MONTH_FULL = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

export function money(n: number, decimals = 2) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** 5 ต.ค. 2569 (พ.ศ.) — ใช้ UTC getter เพราะเก็บเป็น @db.Date */
export function thDate(d: Date) {
  return `${d.getUTCDate()} ${TH_MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear() + 543}`;
}

/** กันยายน 2569 */
export function thPeriod(period: Date) {
  return `${TH_MONTH_FULL[period.getUTCMonth()]} ${period.getUTCFullYear() + 543}`;
}

// ---------- จำนวนเงินเป็นตัวอักษร (ใบเสร็จ) ----------
const DIGIT = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const PLACE = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

function readInt(n: number, hasHigher = false): string {
  let out = "";
  if (n >= 1_000_000) {
    out += readInt(Math.floor(n / 1_000_000)) + "ล้าน";
    n %= 1_000_000;
    if (n === 0) return out;
    hasHigher = true;
  }
  const s = String(n);
  const len = s.length;
  for (let i = 0; i < len; i++) {
    const d = Number(s[i]);
    const p = len - i - 1;
    if (d === 0) continue;
    if (p === 1 && d === 1) out += "สิบ";
    else if (p === 1 && d === 2) out += "ยี่สิบ";
    else if (p === 0 && d === 1 && (len > 1 || hasHigher)) out += "เอ็ด";
    else out += DIGIT[d] + PLACE[p];
  }
  return out;
}

export function bahtText(amount: number): string {
  const v = Math.round(amount * 100) / 100;
  const baht = Math.floor(v);
  const satang = Math.round((v - baht) * 100);
  if (baht === 0 && satang === 0) return "ศูนย์บาทถ้วน";
  return (baht ? readInt(baht) + "บาท" : "") + (satang ? readInt(satang) + "สตางค์" : "ถ้วน");
}

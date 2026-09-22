// สร้าง payload ของ PromptPay ตามสเปก EMVCo (มาตรฐานเดียวกับที่แอปธนาคารไทยสแกน)
// เป็น pure module ไม่แตะฐานข้อมูล

/** แต่ละฟิลด์เป็น id(2) + ความยาว(2) + ค่า */
function tlv(id: string, value: string) {
  return id + String(value.length).padStart(2, "0") + value;
}

/** CRC-16/CCITT-FALSE — poly 0x1021, init 0xFFFF (ตามที่สเปกกำหนด) */
function crc16(input: string) {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * แปลงเลขที่เจ้าของกรอกไว้ให้เป็นรูปแบบที่ PromptPay ใช้
 * เบอร์มือถือ → 0066 + เบอร์ที่ตัด 0 หน้าออก (รวม 13 หลัก)
 * เลขบัตรประชาชน/เลขผู้เสียภาษี 13 หลัก → ใช้ตามนั้น
 */
function target(raw: string): { tag: "01" | "02"; value: string } | null {
  const d = raw.replace(/\D/g, "");
  if (d.length === 13) return { tag: "02", value: d };
  if (d.length === 10 && d.startsWith("0")) return { tag: "01", value: `0066${d.slice(1)}` };
  if (d.length === 9) return { tag: "01", value: `0066${d}` };
  return null;
}

/** คืน payload สำหรับทำ QR — คืน null ถ้าเลขที่ตั้งไว้ไม่เข้ารูปแบบไหนเลย */
export function promptPayPayload(promptPayId: string, amount?: number): string | null {
  const t = target(promptPayId);
  if (!t) return null;

  const merchant = tlv("00", "A000000677010111") + tlv(t.tag, t.value);
  // 11 = QR ใช้ซ้ำได้ (ไม่ระบุยอด) · 12 = ใช้ครั้งเดียว (ระบุยอดมาแล้ว)
  const hasAmount = typeof amount === "number" && amount > 0;

  const body =
    tlv("00", "01") +
    tlv("01", hasAmount ? "12" : "11") +
    tlv("29", merchant) +
    tlv("53", "764") +
    (hasAmount ? tlv("54", amount.toFixed(2)) : "") +
    tlv("58", "TH");

  const withCrcTag = `${body}6304`;
  return withCrcTag + crc16(withCrcTag);
}

import QRCode from "qrcode";
import { promptPayPayload } from "@/lib/promptpay";
import { money } from "@/lib/format";

/**
 * QR พร้อมเพย์ที่แอปธนาคารสแกนได้จริง — สร้างฝั่งเซิร์ฟเวอร์ ไม่ต้องส่ง JS ไปให้เบราว์เซอร์
 * ระบุยอดมาด้วย ผู้เช่าจะได้ไม่ต้องพิมพ์เอง (และโอนผิดยอดไม่ได้)
 */
export async function PromptPayQR({ promptPayId, amount, name }: { promptPayId: string; amount: number; name?: string | null }) {
  const payload = promptPayPayload(promptPayId, amount);
  if (!payload) return null;

  const svg = await QRCode.toString(payload, { type: "svg", margin: 0, errorCorrectionLevel: "M" });

  return (
    <div className="grid justify-items-center gap-2">
      <div className="bg-white rounded-xl border p-3 [&>svg]:size-[208px]" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="grid justify-items-center gap-0.5 text-center">
        <b className="num font-display text-xl">{money(amount)}</b>
        <span className="text-subtle text-[12px]">
          บาท · พร้อมเพย์ {promptPayId}
          {name ? ` · ${name}` : ""}
        </span>
      </div>
      <p className="text-subtle max-w-[260px] text-center text-[12px] leading-snug">
        เปิดแอปธนาคาร เลือกสแกน แล้วส่งสลิปให้สำนักงานหอ — ยอดถูกใส่มาให้แล้ว ไม่ต้องพิมพ์เอง
      </p>
    </div>
  );
}

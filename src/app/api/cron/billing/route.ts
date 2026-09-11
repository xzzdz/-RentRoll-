import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { addMonths, bangkokToday, periodOf } from "@/lib/period";
import { generateDrafts, issueInvoices, processOverdue } from "@/lib/invoice";

/**
 * งานรายวัน — เรียกวันละครั้ง (เช่น 06:00 น.)
 *   - วันที่ billingDay → สร้างบิลร่างรอบเดือนนี้
 *   - วันที่ issueDay และเปิด autoIssue → ส่งบิลร่างทั้งหมด
 *   - ทุกวัน → บิลที่เลยกำหนด เปลี่ยนเป็น OVERDUE + คิดค่าปรับ
 * ป้องกันด้วย header  Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const today = bangkokToday();
  const day = today.getUTCDate();
  const properties = await db.property.findMany({ include: { billingSetting: true } });
  const result: Record<string, unknown>[] = [];

  for (const p of properties) {
    const st = p.billingSetting;
    const r: Record<string, unknown> = { property: p.name };
    if (st && day === st.billingDay) {
      r.drafts = await generateDrafts(p.id, periodOf(today));
    }
    if (st?.autoIssue && day === st.issueDay) {
      // ส่งบิลร่างของรอบเดือนก่อน (กรณีวันส่งบิลอยู่ต้นเดือนถัดไป) และรอบนี้
      r.issuedPrev = await issueInvoices(p.id, { period: addMonths(periodOf(today), -1) });
      r.issued = await issueInvoices(p.id, { period: periodOf(today) });
    }
    r.overdue = await processOverdue(p.id, today);
    result.push(r);
  }
  return NextResponse.json({ date: today.toISOString().slice(0, 10), result });
}

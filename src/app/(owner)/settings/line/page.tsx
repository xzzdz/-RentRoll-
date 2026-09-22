import Link from "next/link";
import { CircleDashed, ExternalLink, Info, Lock } from "lucide-react";
import { db } from "@/lib/db";
import { currentPropertyId } from "@/lib/auth";
import { thDateTime } from "@/lib/format";
import { PageHead } from "@/components/PageHead";
import { Field } from "@/components/Field";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const metadata = { title: "แจ้งเตือนผ่าน LINE" };

/**
 * หน้านี้ยังเป็นตัวอย่าง ไม่ได้ต่อ LINE จริง
 * ตั้งใจให้เห็นว่าเปิดใช้แล้วจะได้อะไร และต้องเตรียมอะไรบ้าง
 * ส่วนที่เป็นข้อมูลจริงมีอย่างเดียว คือข้อความที่ระบบสร้างรอไว้แล้วในตาราง Notification
 * ซึ่งตอนนี้ค้างอยู่เฉย ๆ เพราะยังไม่มีช่องทางส่งออก
 */

const STEPS = [
  {
    title: "สมัคร LINE Official Account",
    detail: "ที่ LINE for Business — ใช้บัญชีฟรีได้ แต่จำกัดจำนวนข้อความต่อเดือน ถ้าหอเกิน 50 ห้องน่าจะต้องขยับเป็นแพ็กเกจเสียเงิน",
    href: "https://www.linebiz.com/th/",
  },
  {
    title: "สร้าง Messaging API channel + LIFF app",
    detail: "ที่ LINE Developers Console จะได้ Channel ID, Channel Secret และ LIFF ID มาใส่ในช่องด้านล่าง",
    href: "https://developers.line.biz/console/",
  },
  {
    title: "เอาระบบขึ้นโดเมนที่เป็น HTTPS",
    detail: "LINE ยิง webhook เข้าเครื่องเราได้เฉพาะ https เท่านั้น รันที่ localhost ไม่พอ ต้อง deploy ขึ้น Vercel หรือโฮสต์อื่นก่อน",
  },
];

const SAMPLES = [
  { type: "บิลออกแล้ว", text: "บิลเดือนกันยายน ห้อง A-301 ยอด 4,850 บาท ครบกำหนด 5 ต.ค. — กดดูรายละเอียดและสแกนจ่ายได้เลย" },
  { type: "ใกล้ครบกำหนด", text: "เหลืออีก 3 วันครบกำหนดชำระ ห้อง A-301 ยอดค้าง 4,850 บาท" },
  { type: "พัสดุถึงแล้ว", text: "มีพัสดุจาก Flash Express ถึงห้อง A-301 แล้ว มารับได้ที่ออฟฟิศ 08:00–20:00 น." },
  { type: "งานซ่อมอัปเดต", text: "งาน MT-202609-0012 (แอร์ไม่เย็น) ช่างรับงานแล้ว นัดเข้าซ่อมพรุ่งนี้บ่าย" },
];

export default async function LineSettingsPage() {
  const propertyId = await currentPropertyId();

  // ของจริง — ข้อความที่ระบบสร้างไว้แล้วแต่ยังไม่มีทางส่ง
  const [queued, recent] = await Promise.all([
    db.notification.count({ where: { status: "QUEUED", user: { propertyId } } }),
    db.notification.findMany({
      where: { user: { propertyId } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, body: true, createdAt: true, status: true },
    }),
  ]);

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <PageHead title="แจ้งเตือนผ่าน LINE" sub="ส่งบิล ใบเสร็จ และข่าวสารถึงผู้เช่าในแชตที่เขาเปิดอยู่แล้วทุกวัน" />

      <div className="bg-warn-soft text-warn flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px]">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          <b className="font-semibold">หน้านี้ยังเป็นตัวอย่าง ยังส่งข้อความจริงไม่ได้</b> — ช่องกรอกด้านล่างยังบันทึกไม่ได้ ตั้งใจทำไว้ให้เห็นภาพว่าเปิดใช้แล้วได้อะไร
          และต้องเตรียมอะไรก่อน
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ต้องเตรียมอะไรบ้าง</CardTitle>
          <CardDescription>สามอย่างนี้เป็นของนอกระบบ ต้องไปทำที่ LINE และที่โฮสต์ก่อน ผมทำแทนให้ไม่ได้</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2.5">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex gap-3 rounded-lg border p-3">
              <span className="bg-muted text-muted-foreground num grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold">{i + 1}</span>
              <div className="grid gap-0.5">
                <b className="text-[14px] font-semibold">
                  {s.title}
                  {s.href && (
                    <Link href={s.href} target="_blank" rel="noopener noreferrer" className="text-primary ml-1.5 inline-flex items-center gap-1 text-[12.5px] font-normal hover:underline">
                      เปิดเว็บ <ExternalLink className="size-3" aria-hidden />
                    </Link>
                  )}
                </b>
                <span className="text-muted-foreground text-[13px] leading-snug">{s.detail}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            คีย์สำหรับเชื่อมต่อ <Badge variant="muted">ยังใช้ไม่ได้</Badge>
          </CardTitle>
          <CardDescription>ได้มาจากขั้นตอนที่ 2 · ตอนเปิดใช้จริงจะเก็บเข้าตัวแปรสภาพแวดล้อม ไม่ได้เก็บลงฐานข้อมูล</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="channelId" label="Channel ID">
              <Input id="channelId" disabled placeholder="2001234567" className="num" />
            </Field>
            <Field id="liffId" label="LIFF ID">
              <Input id="liffId" disabled placeholder="2001234567-abcdWXYZ" className="num" />
            </Field>
          </div>
          <Field id="channelSecret" label="Channel Secret" hint="ความลับ — ห้ามใส่ลงโค้ดหรือส่งในแชต">
            <Input id="channelSecret" disabled type="password" placeholder="••••••••••••••••" />
          </Field>
          <p className="text-subtle flex items-center gap-1.5 border-t pt-3 text-[12.5px]">
            <Lock className="size-3.5" aria-hidden /> ช่องเหล่านี้ถูกปิดไว้ เพราะยังไม่มีปลายทางให้บันทึก
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ข้อความที่จะส่ง</CardTitle>
          <CardDescription>ตัวอย่างข้อความ 4 แบบที่ระบบจะส่งให้อัตโนมัติ ไม่ใช่ภาพจากแอป LINE จริง</CardDescription>
        </CardHeader>
        <CardContent className="bg-muted grid gap-2.5 rounded-lg p-3">
          {SAMPLES.map((m) => (
            <div key={m.type} className="grid gap-1">
              <span className="eyebrow">{m.type}</span>
              <p className="bg-card w-fit max-w-[85%] rounded-xl rounded-tl-sm border px-3 py-2 text-[13.5px] leading-snug shadow-xs">{m.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ข้อความที่รอส่งอยู่จริง
            {queued > 0 && <Badge variant="warn">{queued} ข้อความ</Badge>}
          </CardTitle>
          <CardDescription>
            ส่วนนี้เป็นข้อมูลจริง — ระบบสร้างข้อความเตือนไว้แล้ว (เช่น สัญญาใกล้หมดอายุ) แต่ยังค้างอยู่เพราะไม่มีช่องทางส่ง พอต่อ LINE เสร็จ ของที่ค้างจะถูกส่งออกไป
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-muted-foreground flex items-center gap-2 text-[13.5px]">
              <CircleDashed className="text-subtle size-4" aria-hidden /> ยังไม่มีข้อความค้างอยู่
            </p>
          ) : (
            <div className="grid gap-1.5">
              {recent.map((n) => (
                <div key={n.id} className="grid gap-0.5 rounded-lg border px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <b className="truncate text-[13.5px] font-semibold">{n.title}</b>
                    <Badge variant={n.status === "QUEUED" ? "warn" : "muted"}>{n.status === "QUEUED" ? "รอส่ง" : "ส่งแล้ว"}</Badge>
                  </div>
                  <span className="text-muted-foreground text-[12.5px] leading-snug">{n.body}</span>
                  <span className="text-subtle text-[11.5px]">{thDateTime(n.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

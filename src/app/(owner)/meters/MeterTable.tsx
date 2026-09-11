"use client";

import { useRef, useState, useTransition } from "react";
import { buildBill, meterUnits, type RateConfig } from "@/lib/billing";
import { money } from "@/lib/format";
import type { MeterCell, MeterRow } from "@/lib/meters";
import { saveReading } from "./actions";

type Status = "idle" | "saving" | "saved" | "error";
type Rates = { water: RateConfig | null; electric: RateConfig | null };

export function MeterTable({ rows, rates }: { rows: MeterRow[]; rates: Rates }) {
  // ค่าที่กรอก เก็บเป็น string ตาม meterId
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const r of rows) for (const c of [r.water, r.electric]) if (c) v[c.meterId] = c.curr == null ? "" : String(c.curr);
    return v;
  });
  const [status, setStatus] = useState<Record<string, { s: Status; msg?: string }>>({});
  // ล็อกรายการห้องตอนติ๊ก เพื่อไม่ให้แถวหายไประหว่างพิมพ์
  const [pendingIds, setPendingIds] = useState<Set<string> | null>(null);
  const [, startTransition] = useTransition();
  // ค่าที่บันทึกลงฐานข้อมูลล่าสุด — กันบันทึกซ้ำเมื่อค่าไม่เปลี่ยน
  const savedRef = useRef<Record<string, number | null>>(
    Object.fromEntries(rows.flatMap((r) => [r.water, r.electric]).filter((c): c is MeterCell => !!c).map((c) => [c.meterId, c.curr])),
  );

  const parsed = (c: MeterCell | null) => {
    if (!c) return null;
    const raw = values[c.meterId];
    return raw === "" || raw == null ? null : Number(raw);
  };

  const isDone = (r: MeterRow) =>
    (!r.water || rates.water?.mode === "FLAT" || parsed(r.water) != null) &&
    (!r.electric || rates.electric?.mode === "FLAT" || parsed(r.electric) != null);

  const done = rows.filter(isDone).length;
  const visible = pendingIds ? rows.filter((r) => pendingIds.has(r.roomId)) : rows;

  function commit(c: MeterCell) {
    const raw = values[c.meterId];
    const v = raw === "" ? null : Number(raw);
    if (v === savedRef.current[c.meterId]) return;
    if (v != null && (!Number.isFinite(v) || v < 0)) {
      setStatus((s) => ({ ...s, [c.meterId]: { s: "error", msg: "ตัวเลขไม่ถูกต้อง" } }));
      return;
    }
    setStatus((s) => ({ ...s, [c.meterId]: { s: "saving" } }));
    startTransition(async () => {
      const res = await saveReading(c.meterId, v);
      if (res.ok) savedRef.current[c.meterId] = v;
      setStatus((s) => ({ ...s, [c.meterId]: res.ok ? { s: "saved" } : { s: "error", msg: res.error } }));
    });
  }

  function cell(r: MeterRow, c: MeterCell | null, cfg: RateConfig | null, label: string) {
    if (!c) return <td colSpan={3} className="px-2.5 text-subtle">ไม่มีมิเตอร์</td>;
    if (cfg?.mode === "FLAT") return <td colSpan={3} className="px-2.5 text-subtle">เหมาจ่าย · ไม่ต้องจด</td>;
    const v = parsed(c);
    const units = v != null && c.prev != null ? meterUnits(c.prev, v, c.maxReading) : null;
    const bad = v != null && c.prev != null && units === null;
    const st = status[c.meterId];
    return (
      <>
        <td className="num px-2.5 text-right text-subtle">{c.prev != null ? money(c.prev, 0) : "—"}</td>
        <td className="px-2.5">
          <input
            id={`rd-${c.meterId}`}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            aria-label={`เลขมิเตอร์${label} ห้อง ${r.number}`}
            value={values[c.meterId] ?? ""}
            onChange={(e) => setValues((s) => ({ ...s, [c.meterId]: e.target.value }))}
            onBlur={() => commit(c)}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            placeholder="—"
            className={`num w-24 rounded-md border px-2 py-1 text-right focus:outline-none ${
              bad || st?.s === "error"
                ? "border-destructive bg-bad-soft"
                : v != null
                  ? "border-ok bg-card"
                  : "bg-background focus:border-primary"
            }`}
          />
          <span className="block text-[11px] leading-4" aria-live="polite">
            {bad ? (
              <span className="text-destructive">น้อยกว่าครั้งก่อน</span>
            ) : st?.s === "saving" ? (
              <span className="text-subtle">กำลังบันทึก…</span>
            ) : st?.s === "error" ? (
              <span className="text-destructive">{st.msg}</span>
            ) : st?.s === "saved" ? (
              <span className="text-ok">บันทึกแล้ว</span>
            ) : null}
          </span>
        </td>
        <td className="num px-2.5 text-right">{units != null ? money(units, 0) : "—"}</td>
      </>
    );
  }

  const rateLabel = (cfg: RateConfig | null) =>
    !cfg ? "ยังไม่ตั้งอัตรา" : cfg.mode === "FLAT" ? "เหมาจ่าย" : cfg.mode === "TIERED" ? "ขั้นบันได" : `${money(cfg.unitPrice ?? 0, 2)} ฿/หน่วย`;

  return (
    <div className="bg-card rounded-xl border">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-[13px]">
          <input id="only-pending" type="checkbox" checked={pendingIds !== null}
            onChange={(e) => setPendingIds(e.target.checked ? new Set(rows.filter((r) => !isDone(r)).map((r) => r.roomId)) : null)} />
          เฉพาะห้องที่ยังไม่จด
        </label>
        <div className="min-w-[180px]">
          <div className="mb-1 text-[12.5px] text-muted-foreground">
            จดแล้ว <b className="num">{done}</b> / {rows.length} ห้อง
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <i className="block h-full rounded-full bg-primary" style={{ width: `${rows.length ? (done / rows.length) * 100 : 0}%` }} />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13.5px]">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th rowSpan={2} className="px-2.5 py-2 text-left">ห้อง</th>
              <th rowSpan={2} className="px-2.5 py-2 text-left">ผู้เช่า</th>
              <th colSpan={3} className="px-2.5 pt-2 text-center text-warn">น้ำ · {rateLabel(rates.water)}</th>
              <th colSpan={3} className="px-2.5 pt-2 text-center text-warn">ไฟ · {rateLabel(rates.electric)}</th>
              <th rowSpan={2} className="px-2.5 py-2 text-right">ยอดบิล (บาท)</th>
            </tr>
            <tr className="border-b">
              {["ครั้งก่อน", "ครั้งนี้", "หน่วย", "ครั้งก่อน", "ครั้งนี้", "หน่วย"].map((h, i) => (
                <th key={i} className={`px-2.5 py-1.5 ${h === "ครั้งนี้" ? "text-left" : "text-right"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const w = parsed(r.water), e = parsed(r.electric);
              const bill = buildBill({
                rent: r.rent,
                water: r.water && r.water.prev != null && w != null ? { prev: r.water.prev, curr: w, maxReading: r.water.maxReading } : null,
                electric: r.electric && r.electric.prev != null && e != null ? { prev: r.electric.prev, curr: e, maxReading: r.electric.maxReading } : null,
                rates,
                fees: r.fees,
              });
              return (
                <tr key={r.roomId} className="border-b last:border-0">
                  <td className="px-2.5 py-2 font-display font-bold">{r.number}</td>
                  <td className="px-2.5 py-2">{r.tenantName}</td>
                  {cell(r, r.water, rates.water, "น้ำ")}
                  {cell(r, r.electric, rates.electric, "ไฟ")}
                  <td className="num px-2.5 py-2 text-right font-semibold">{bill ? money(bill.total) : "—"}</td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-muted-foreground">
                  {rows.length ? "จดครบทุกห้องแล้ว" : "ตึกนี้ยังไม่มีห้องที่มีสัญญา"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="border-t px-4 py-3 text-[12.5px] text-subtle">
        กรอกแล้วกด Enter หรือคลิกออกเพื่อบันทึก · ห้องที่เพิ่งเข้าอยู่ ระบบใช้เลขตั้งต้นตอนทำสัญญาเป็นเลขครั้งก่อน · เลขน้อยกว่าครั้งก่อน =
        มิเตอร์วนรอบหรือเปลี่ยนมิเตอร์ ให้ตั้งค่าสูงสุดของมิเตอร์หรือบันทึกเปลี่ยนมิเตอร์
      </p>
    </div>
  );
}

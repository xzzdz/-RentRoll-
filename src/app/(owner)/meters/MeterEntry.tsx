"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check, ChevronLeft, ChevronRight, Droplets, Loader2, TriangleAlert, Zap } from "lucide-react";
import { buildBill, meterUnits, utilityCharge, type RateConfig } from "@/lib/billing";
import { money } from "@/lib/format";
import type { MeterCell, MeterRow } from "@/lib/meters";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { saveReading } from "./actions";

type Rates = { water: RateConfig | null; electric: RateConfig | null };
type Status = "idle" | "saving" | "saved" | "error";

export function MeterEntry({ rows, rates }: { rows: MeterRow[]; rates: Rates }) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const r of rows) for (const c of [r.water, r.electric]) if (c) v[c.meterId] = c.curr == null ? "" : String(c.curr);
    return v;
  });
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const savedRef = useRef<Record<string, number | null>>(
    Object.fromEntries(rows.flatMap((r) => [r.water, r.electric]).filter((c): c is MeterCell => !!c).map((c) => [c.meterId, c.curr])),
  );
  const electricRef = useRef<HTMLInputElement>(null);

  const needs = (cfg: RateConfig | null) => !!cfg && cfg.mode !== "FLAT";
  const parsed = (c: MeterCell | null) => {
    if (!c) return null;
    const raw = values[c.meterId];
    return raw === "" || raw == null ? null : Number(raw);
  };
  const isDone = (r: MeterRow) =>
    (!r.water || !needs(rates.water) || parsed(r.water) != null) && (!r.electric || !needs(rates.electric) || parsed(r.electric) != null);

  const done = rows.filter(isDone).length;
  const room = rows[index];

  // เริ่มที่ห้องแรกที่ยังไม่จด จะได้ไม่ต้องกดข้ามเอง
  useEffect(() => {
    const first = rows.findIndex((r) => !isDone(r));
    if (first > 0) setIndex(first);
    // ตั้งครั้งเดียวตอนเปิดหน้า
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function commit(c: MeterCell | null) {
    if (!c) return;
    const raw = values[c.meterId];
    const v = raw === "" ? null : Number(raw);
    if (v === savedRef.current[c.meterId]) return;
    if (v != null && (!Number.isFinite(v) || v < 0)) {
      setStatus("error");
      setError("เลขมิเตอร์ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป");
      return;
    }
    setStatus("saving");
    setError(null);
    startTransition(async () => {
      const res = await saveReading(c.meterId, v);
      if (res.ok) {
        savedRef.current[c.meterId] = v;
        setStatus("saved");
      } else {
        setStatus("error");
        setError(res.error);
      }
    });
  }

  function go(next: number) {
    if (!room) return;
    commit(room.water);
    commit(room.electric);
    setIndex(Math.min(rows.length - 1, Math.max(0, next)));
  }

  function jumpToNextPending() {
    const from = index + 1;
    const found = rows.findIndex((r, i) => i >= from && !isDone(r));
    go(found === -1 ? index + 1 : found);
  }

  const bill = useMemo(() => {
    if (!room) return null;
    const w = parsed(room.water);
    const e = parsed(room.electric);
    return buildBill({
      rent: room.rent,
      roomTypeName: room.roomTypeName,
      water: room.water && room.water.prev != null && w != null ? { prev: room.water.prev, curr: w, maxReading: room.water.maxReading } : null,
      electric: room.electric && room.electric.prev != null && e != null ? { prev: room.electric.prev, curr: e, maxReading: room.electric.maxReading } : null,
      rates,
      fees: room.fees,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, values, rates]);

  if (rows.length === 0) {
    return <p className="bg-card text-muted-foreground rounded-xl border p-6 text-center">ตึกนี้ยังไม่มีห้องที่มีสัญญา</p>;
  }

  return (
    <div className="grid gap-3">
      {/* ความคืบหน้า */}
      <div className="bg-card/90 sticky top-[57px] z-20 grid gap-1.5 rounded-xl border px-4 py-3 backdrop-blur lg:top-0">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-muted-foreground">
            จดแล้ว <b className="num text-foreground">{done}</b> / {rows.length} ห้อง
          </span>
          <span className="text-subtle num text-[12px]">
            ห้องที่ {index + 1} / {rows.length}
          </span>
        </div>
        <div className="bg-muted h-2 overflow-hidden rounded-full">
          <i className="bg-primary block h-full rounded-full transition-[width] duration-300" style={{ width: `${(done / rows.length) * 100}%` }} />
        </div>
      </div>

      {/* ห้องปัจจุบัน */}
      <Card className="animate-rise" key={room.roomId}>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="font-display text-2xl leading-none font-bold">{room.number}</h2>
              <p className="text-muted-foreground mt-1 text-[13px]">
                {room.tenantName} · ชั้น {room.floor} · {room.roomTypeName}
              </p>
            </div>
            {isDone(room) && (
              <span className="text-ok inline-flex items-center gap-1 text-[13px] font-semibold">
                <Check className="size-4" aria-hidden /> จดแล้ว
              </span>
            )}
          </div>

          <MeterField
            cell={room.water}
            cfg={rates.water}
            label="มิเตอร์น้ำ"
            icon={Droplets}
            value={room.water ? (values[room.water.meterId] ?? "") : ""}
            onChange={(v) => room.water && setValues((s) => ({ ...s, [room.water!.meterId]: v }))}
            onBlur={() => commit(room.water)}
            onEnter={() => electricRef.current?.focus()}
          />
          <MeterField
            cell={room.electric}
            cfg={rates.electric}
            label="มิเตอร์ไฟ"
            icon={Zap}
            inputRef={electricRef}
            value={room.electric ? (values[room.electric.meterId] ?? "") : ""}
            onChange={(v) => room.electric && setValues((s) => ({ ...s, [room.electric!.meterId]: v }))}
            onBlur={() => commit(room.electric)}
            onEnter={jumpToNextPending}
          />

          <div className="bg-muted flex items-center justify-between rounded-lg px-3 py-2.5">
            <span className="text-muted-foreground text-[13px]">ยอดบิลโดยประมาณ</span>
            <b className="num font-display text-[17px] font-semibold">{bill ? `${money(bill.total)} บาท` : "—"}</b>
          </div>

          {error && (
            <p role="alert" className="bg-bad-soft text-destructive rounded-md px-3 py-2 text-[13px]">
              {error}
            </p>
          )}

          <div className="grid grid-cols-[auto_1fr] gap-2">
            <Button variant="outline" onClick={() => go(index - 1)} disabled={index === 0} aria-label="ห้องก่อนหน้า" className="h-12">
              <ChevronLeft />
            </Button>
            <Button onClick={jumpToNextPending} disabled={index >= rows.length - 1} className="h-12">
              {status === "saving" ? <Loader2 className="animate-spin" /> : null}
              ห้องถัดไป <ChevronRight />
            </Button>
          </div>
          <p className="text-subtle text-center text-[11.5px]">
            {status === "saving" ? "กำลังบันทึก…" : status === "saved" ? "บันทึกอัตโนมัติแล้ว" : "กรอกแล้วกด Enter เพื่อไปช่องถัดไป"}
          </p>
        </CardContent>
      </Card>

      {/* กระโดดไปห้องไหนก็ได้ */}
      <details className="bg-card rounded-xl border" open={rows.length <= 24}>
        <summary className="cursor-pointer px-4 py-3 text-[13px] font-semibold">ทุกห้องในตึกนี้ ({rows.length})</summary>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(66px,1fr))] gap-1.5 px-4 pb-4">
          {rows.map((r, i) => {
            const ok = isDone(r);
            return (
              <button
                key={r.roomId}
                type="button"
                onClick={() => go(i)}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "num min-h-10 rounded-lg border px-1 text-[12.5px] font-semibold",
                  i === index && "ring-primary ring-2",
                  ok ? "bg-ok-soft text-ok border-transparent" : "bg-background hover:bg-muted",
                )}
              >
                {r.number}
              </button>
            );
          })}
        </div>
      </details>
    </div>
  );
}

function MeterField({
  cell,
  cfg,
  label,
  icon: Icon,
  value,
  onChange,
  onBlur,
  onEnter,
  inputRef,
}: {
  cell: MeterCell | null;
  cfg: RateConfig | null;
  label: string;
  icon: typeof Droplets;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  onEnter: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  if (!cell) return <FieldNote label={label} icon={Icon} note="ห้องนี้ไม่มีมิเตอร์" />;
  if (!cfg) return <FieldNote label={label} icon={Icon} note="ยังไม่ได้ตั้งอัตรา — ตั้งที่หน้าตั้งค่า" />;
  if (cfg.mode === "FLAT") return <FieldNote label={label} icon={Icon} note="คิดแบบเหมาจ่าย ไม่ต้องจด" />;

  const v = value === "" ? null : Number(value);
  const units = v != null && cell.prev != null ? meterUnits(cell.prev, v, cell.maxReading) : null;
  const charge = units != null ? utilityCharge(cfg, units) : null;
  const rollback = v != null && cell.prev != null && v < cell.prev && !cell.maxReading;

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold">
          <Icon className="text-primary size-4" aria-hidden /> {label}
        </span>
        <span className="text-subtle num text-[12px]">ครั้งก่อน {cell.prev == null ? "—" : money(cell.prev, 0)}</span>
      </div>
      <input
        ref={inputRef}
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onBlur();
            onEnter();
          }
        }}
        aria-label={`เลข${label}ครั้งนี้`}
        placeholder={cell.prev == null ? "เลขมิเตอร์" : String(cell.prev)}
        className={cn(
          "num border-input bg-background h-14 w-full rounded-xl border px-4 text-center text-2xl font-semibold",
          "focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-2 focus-visible:outline-none",
          rollback && "border-destructive",
        )}
      />
      <div className="flex min-h-[18px] items-center justify-between text-[12px]">
        {rollback ? (
          <span className="text-destructive inline-flex items-center gap-1">
            <TriangleAlert className="size-3.5" aria-hidden /> น้อยกว่าครั้งก่อน — ตรวจเลขอีกครั้ง
          </span>
        ) : units != null ? (
          <span className="text-muted-foreground">
            ใช้ไป <b className="num text-foreground">{money(units, 0)}</b> หน่วย
          </span>
        ) : (
          <span className="text-subtle">{cell.prev == null ? "ยังไม่มีเลขตั้งต้น" : "รอกรอกเลข"}</span>
        )}
        {charge && <span className="num text-muted-foreground">{money(charge.amount)} บาท</span>}
      </div>
    </div>
  );
}

function FieldNote({ label, icon: Icon, note }: { label: string; icon: typeof Droplets; note: string }) {
  return (
    <div className="text-subtle flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-2.5 text-[13px]">
      <Icon className="size-4" aria-hidden /> {label} · {note}
    </div>
  );
}

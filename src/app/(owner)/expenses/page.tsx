import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { currentPropertyId } from "@/lib/auth";
import { addMonths, bangkokToday, periodOf } from "@/lib/period";
import { money, thDate, thPeriod } from "@/lib/format";
import { EXPENSE_CATEGORY } from "@/lib/expense";
import { round2 } from "@/lib/billing";
import { cn } from "@/lib/utils";
import { PageHead } from "@/components/PageHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExpenseForm } from "./ExpenseForm";
import { ExpenseRow } from "./ExpenseRow";

export const metadata = { title: "รายจ่าย" };

const parsePeriod = (p?: string) => (p && /^\d{4}-\d{2}$/.test(p) ? new Date(`${p}-01T00:00:00Z`) : periodOf());
const key = (d: Date) => d.toISOString().slice(0, 7);

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  const period = parsePeriod(p);
  const next = addMonths(period, 1);
  const propertyId = await currentPropertyId();

  const [expenses, buildings, income] = await Promise.all([
    db.expense.findMany({
      where: { propertyId, spentAt: { gte: period, lt: next } },
      orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
      include: { building: { select: { name: true } } },
    }),
    db.building.findMany({ where: { propertyId }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.payment.aggregate({
      where: { status: "CONFIRMED", paidAt: { gte: period, lt: next }, invoice: { contract: { room: { building: { propertyId } } } } },
      _sum: { amount: true },
    }),
  ]);

  const total = round2(expenses.reduce((s, e) => s + e.amount.toNumber(), 0));
  const received = income._sum.amount?.toNumber() ?? 0;
  const profit = round2(received - total);
  const isCurrent = period.getTime() === periodOf(bangkokToday()).getTime();

  // รวมยอดรายหมวด เรียงจากมากไปน้อย
  const byCategory = Object.entries(
    expenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount.toNumber();
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHead title="รายจ่าย" sub="บันทึกเงินที่หอจ่ายออก เพื่อให้ภาพรวมบอกกำไร-ขาดทุนได้จริง">
        <div className="bg-card flex items-center gap-1 rounded-lg border p-1">
          <Button variant="ghost" size="sm" asChild aria-label="เดือนก่อนหน้า">
            <Link href={`/expenses?p=${key(addMonths(period, -1))}`}>
              <ChevronLeft />
            </Link>
          </Button>
          <span className="font-display min-w-[124px] text-center text-[13.5px] font-semibold">{thPeriod(period)}</span>
          <Button variant="ghost" size="sm" asChild aria-label="เดือนถัดไป">
            <Link
              href={`/expenses?p=${key(addMonths(period, 1))}`}
              aria-disabled={isCurrent}
              className={cn(isCurrent && "pointer-events-none opacity-40")}
            >
              <ChevronRight />
            </Link>
          </Button>
        </div>
      </PageHead>

      <div className="mb-4 grid grid-cols-3 gap-3">
        {[
          { label: "รับจริงเดือนนี้", value: money(received, 0), tone: "" },
          { label: "จ่ายออก", value: money(total, 0), tone: "" },
          { label: profit >= 0 ? "กำไร" : "ขาดทุน", value: money(Math.abs(profit), 0), tone: profit >= 0 ? "text-ok" : "text-destructive" },
        ].map((k) => (
          <div key={k.label} className="bg-card rounded-xl border px-3 py-3">
            <div className="eyebrow">{k.label}</div>
            <div className={cn("font-display mt-0.5 text-[20px] leading-tight font-semibold tabular-nums", k.tone)}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-3">
        <ExpenseForm buildings={buildings} period={key(period)} today={bangkokToday().toISOString().slice(0, 10)} />

        {byCategory.length > 0 && (
          <Card>
            <CardContent className="grid gap-1.5">
              <div className="eyebrow">รวมรายหมวด</div>
              {byCategory.map(([cat, amount]) => (
                <div key={cat} className="grid grid-cols-[minmax(0,1fr)_60px_72px] items-center gap-2 text-[13px]">
                  <span className="text-muted-foreground truncate">{EXPENSE_CATEGORY[cat as keyof typeof EXPENSE_CATEGORY].label}</span>
                  <span className="bg-muted h-1.5 overflow-hidden rounded-full" aria-hidden>
                    <i className="bg-chart-1 block h-full rounded-full" style={{ width: `${(amount / total) * 100}%` }} />
                  </span>
                  <span className="num text-right">{money(amount, 0)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {expenses.map((e) => (
          <ExpenseRow
            key={e.id}
            expense={{
              id: e.id,
              description: e.description,
              amount: e.amount.toNumber(),
              category: e.category,
              spentAt: e.spentAt.toISOString().slice(0, 10),
              spentAtLabel: thDate(e.spentAt),
              buildingId: e.buildingId,
              buildingName: e.building?.name ?? null,
              note: e.note,
            }}
            buildings={buildings}
            period={key(period)}
          />
        ))}

        {expenses.length === 0 && (
          <p className="bg-card text-muted-foreground rounded-xl border border-dashed p-6 text-center">
            ยังไม่มีรายจ่ายในเดือน {thPeriod(period)}
          </p>
        )}
      </div>
    </div>
  );
}

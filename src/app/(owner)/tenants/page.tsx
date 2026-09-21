import Link from "next/link";
import type { ContractStatus, Prisma } from "@prisma/client";
import { Phone, Plus, Search } from "lucide-react";
import { db } from "@/lib/db";
import { bangkokToday } from "@/lib/period";
import { money, thDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHead } from "@/components/PageHead";
import { CONTRACT_STATUS, StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const TABS: { key: string; label: string; status: ContractStatus[] }[] = [
  { key: "active", label: "ใช้งาน", status: ["ACTIVE"] },
  { key: "ended", label: "สิ้นสุดแล้ว", status: ["ENDED", "TERMINATED"] },
];

type Row = {
  id: string;
  roomId: string;
  roomNumber: string;
  contractNo: string;
  status: ContractStatus;
  tenant: string;
  phone: string | null;
  others: number;
  rent: number;
  owed: number;
  start: Date;
  end: Date | null;
  note: "ending" | "expired" | null;
};

export default async function TenantsPage({ searchParams }: { searchParams: Promise<{ q?: string; tab?: string }> }) {
  const { q = "", tab = "active" } = await searchParams;
  const current = TABS.find((t) => t.key === tab) ?? TABS[0];
  const today = bangkokToday();
  const in60 = new Date(today.getTime() + 60 * 86_400_000);
  const search = q.trim();

  const where: Prisma.ContractWhereInput = {
    status: { in: current.status },
    ...(search
      ? {
          OR: [
            { contractNo: { contains: search, mode: "insensitive" } },
            { room: { number: { contains: search, mode: "insensitive" } } },
            { tenants: { some: { tenant: { OR: [{ fullName: { contains: search, mode: "insensitive" } }, { phone: { contains: search } }] } } } },
          ],
        }
      : {}),
  };

  const contracts = await db.contract.findMany({
    where,
    orderBy: [{ room: { number: "asc" } }],
    take: 300,
    include: {
      room: { include: { building: true } },
      tenants: { include: { tenant: true }, orderBy: { isPrimary: "desc" } },
      invoices: { where: { status: { in: ["ISSUED", "PARTIAL", "OVERDUE"] } }, select: { total: true, paidAmount: true } },
    },
  });

  const rows: Row[] = contracts.map((c) => {
    const primary = c.tenants[0]?.tenant;
    const ending = c.status === "ACTIVE" && c.endDate && c.endDate >= today && c.endDate <= in60;
    const expired = c.status === "ACTIVE" && c.endDate && c.endDate < today;
    return {
      id: c.id,
      roomId: c.roomId,
      roomNumber: c.room.number,
      contractNo: c.contractNo,
      status: c.status,
      tenant: primary?.fullName ?? "-",
      phone: primary?.phone ?? null,
      others: Math.max(0, c.tenants.length - 1),
      rent: c.monthlyRent.toNumber(),
      owed: c.invoices.reduce((s, i) => s + i.total.toNumber() - i.paidAmount.toNumber(), 0),
      start: c.startDate,
      end: c.endDate,
      note: expired ? "expired" : ending ? "ending" : null,
    };
  });

  const owing = rows.filter((r) => r.owed > 0).length;

  return (
    <>
      <PageHead title="ผู้เช่า & สัญญา" sub={`${rows.length} สัญญา${owing ? ` · ค้างชำระ ${owing} ห้อง` : ""}`}>
        <Button asChild>
          <Link href="/contracts/new">
            <Plus /> ทำสัญญาใหม่
          </Link>
        </Button>
      </PageHead>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <nav className="bg-muted inline-flex gap-0.5 rounded-lg p-[3px]">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/tenants?tab=${t.key}${search ? `&q=${encodeURIComponent(search)}` : ""}`}
              aria-current={t.key === current.key ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                t.key === current.key ? "bg-card shadow-xs" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <form className="relative w-full sm:max-w-xs">
          <input type="hidden" name="tab" value={current.key} />
          <Search className="text-subtle pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input name="q" defaultValue={search} placeholder="ค้นหาชื่อ เบอร์ ห้อง เลขสัญญา" className="h-11 pl-8" aria-label="ค้นหา" />
        </form>
      </div>

      {rows.length === 0 && <p className="bg-card text-muted-foreground rounded-xl border border-dashed p-8 text-center">ไม่พบสัญญา</p>}

      {/* มือถือ: การ์ดต่อสัญญา — ตารางกว้าง ๆ ใช้บนจอเล็กไม่ได้ */}
      <div className="grid gap-2 lg:hidden">
        {rows.map((r) => (
          <Card key={r.id}>
            <CardContent className="grid gap-1.5">
              <div className="flex items-center gap-2">
                <Link href={`/rooms/${r.roomId}`} className="font-display text-lg font-bold hover:underline">
                  {r.roomNumber}
                </Link>
                <StatusBadge map={CONTRACT_STATUS[r.status]} />
                {r.note && <Badge variant={r.note === "expired" ? "bad" : "warn"}>{r.note === "expired" ? "เลยกำหนด" : "ใกล้หมด"}</Badge>}
                <span className="num ml-auto text-[13px] font-semibold">{money(r.rent, 0)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 text-[13px]">
                <span>{r.tenant}</span>
                {r.others > 0 && <span className="text-subtle text-[11px]">+{r.others}</span>}
                {r.phone && (
                  <a href={`tel:${r.phone}`} className="text-primary num inline-flex items-center gap-1 text-[12.5px]">
                    <Phone className="size-3" aria-hidden /> {r.phone}
                  </a>
                )}
              </div>
              <div className="text-subtle flex flex-wrap items-center gap-x-2 text-[11.5px]">
                <span className="num">{r.contractNo}</span>
                <span>
                  · {thDate(r.start)} – {r.end ? thDate(r.end) : "ไม่กำหนด"}
                </span>
              </div>
              {r.owed > 0 && (
                <div className="bg-bad-soft text-destructive rounded-md px-2 py-1 text-[12.5px]">
                  ค้างชำระ <b className="num">{money(r.owed)}</b> บาท
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* จอใหญ่: ตารางเต็ม */}
      {rows.length > 0 && (
        <div className="bg-card hidden rounded-xl border lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ห้อง</TableHead>
                <TableHead>ผู้เช่า</TableHead>
                <TableHead>เบอร์โทร</TableHead>
                <TableHead>สัญญา</TableHead>
                <TableHead>ระยะเวลา</TableHead>
                <TableHead className="text-right">ค่าเช่า</TableHead>
                <TableHead className="text-right">ค้างชำระ</TableHead>
                <TableHead>สถานะ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link href={`/rooms/${r.roomId}`} className="font-display font-bold hover:underline">
                      {r.roomNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {r.tenant}
                    {r.others > 0 && <span className="text-subtle text-xs"> +{r.others}</span>}
                  </TableCell>
                  <TableCell className="num">{r.phone ?? "-"}</TableCell>
                  <TableCell className="num text-muted-foreground">{r.contractNo}</TableCell>
                  <TableCell>
                    {thDate(r.start)} – {r.end ? thDate(r.end) : "ไม่กำหนด"}
                    {r.note && (
                      <Badge variant={r.note === "expired" ? "bad" : "warn"} className="ml-2">
                        {r.note === "expired" ? "เลยกำหนด" : "ใกล้หมด"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="num text-right">{money(r.rent, 0)}</TableCell>
                  <TableCell className={cn("num text-right", r.owed > 0 && "text-destructive font-semibold")}>
                    {r.owed > 0 ? money(r.owed) : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge map={CONTRACT_STATUS[r.status]} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}

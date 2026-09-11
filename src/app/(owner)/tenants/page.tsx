import Link from "next/link";
import type { ContractStatus, Prisma } from "@prisma/client";
import { Plus, Search } from "lucide-react";
import { db } from "@/lib/db";
import { bangkokToday } from "@/lib/period";
import { money, thDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHead } from "@/components/PageHead";
import { CONTRACT_STATUS, StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const TABS: { key: string; label: string; status: ContractStatus[] }[] = [
  { key: "active", label: "ใช้งาน", status: ["ACTIVE"] },
  { key: "ended", label: "สิ้นสุดแล้ว", status: ["ENDED", "TERMINATED"] },
];

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
      invoices: { where: { status: { in: ["ISSUED", "PARTIAL", "OVERDUE"] } }, select: { total: true, paidAmount: true, status: true } },
    },
  });

  return (
    <>
      <PageHead title="ผู้เช่า & สัญญา" sub={`${contracts.length} สัญญา`}>
        <Button asChild>
          <Link href="/contracts/new">
            <Plus /> ทำสัญญาใหม่
          </Link>
        </Button>
      </PageHead>

      <div className="bg-card rounded-xl border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <nav className="bg-muted inline-flex gap-0.5 rounded-lg p-[3px]">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={`/tenants?tab=${t.key}${search ? `&q=${encodeURIComponent(search)}` : ""}`}
                aria-current={t.key === current.key ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1 text-sm font-medium",
                  t.key === current.key ? "bg-card shadow-xs" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <form className="relative w-full max-w-xs">
            <input type="hidden" name="tab" value={current.key} />
            <Search className="text-subtle pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input name="q" defaultValue={search} placeholder="ค้นหาชื่อ เบอร์ ห้อง เลขสัญญา" className="pl-8" aria-label="ค้นหา" />
          </form>
        </div>

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
            {contracts.map((c) => {
              const primary = c.tenants[0]?.tenant;
              const owed = c.invoices.reduce((s, i) => s + i.total.toNumber() - i.paidAmount.toNumber(), 0);
              const ending = c.status === "ACTIVE" && c.endDate && c.endDate >= today && c.endDate <= in60;
              const expired = c.status === "ACTIVE" && c.endDate && c.endDate < today;
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/rooms/${c.roomId}`} className="font-display font-bold hover:underline">
                      {c.room.number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {primary?.fullName ?? "-"}
                    {c.tenants.length > 1 && <span className="text-subtle text-xs"> +{c.tenants.length - 1}</span>}
                  </TableCell>
                  <TableCell className="num">{primary?.phone ?? "-"}</TableCell>
                  <TableCell className="num text-muted-foreground">{c.contractNo}</TableCell>
                  <TableCell>
                    {thDate(c.startDate)} – {c.endDate ? thDate(c.endDate) : "ไม่กำหนด"}
                    {ending && <Badge variant="warn" className="ml-2">ใกล้หมด</Badge>}
                    {expired && <Badge variant="bad" className="ml-2">เลยกำหนด</Badge>}
                  </TableCell>
                  <TableCell className="num text-right">{money(c.monthlyRent.toNumber(), 0)}</TableCell>
                  <TableCell className={cn("num text-right", owed > 0 && "text-destructive font-semibold")}>{owed > 0 ? money(owed) : "—"}</TableCell>
                  <TableCell>
                    <StatusBadge map={CONTRACT_STATUS[c.status]} />
                  </TableCell>
                </TableRow>
              );
            })}
            {contracts.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
                  ไม่พบสัญญา
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

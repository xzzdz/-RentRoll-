"use server";

import type { ExpenseCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, currentPropertyId } from "@/lib/auth";
import { withFlash } from "@/lib/flash";
import { EXPENSE_CATEGORIES } from "@/lib/expense";
import { assertOwnRow } from "@/lib/scope";

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const back = (f: FormData) => {
  const p = text(f, "period");
  return `/expenses${/^\d{4}-\d{2}$/.test(p) ? `?p=${p}` : ""}`;
};

function parse(f: FormData) {
  const description = text(f, "description");
  const amount = Number(text(f, "amount"));
  const spentAt = text(f, "spentAt");
  const raw = text(f, "category") as ExpenseCategory;

  if (!description) return { error: "ใส่รายการที่จ่าย" };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "จำนวนเงินต้องมากกว่า 0" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(spentAt)) return { error: "เลือกวันที่จ่าย" };
  if (!EXPENSE_CATEGORIES.includes(raw)) return { error: "เลือกหมวดรายจ่าย" };

  return {
    data: {
      description,
      amount,
      spentAt: new Date(`${spentAt}T00:00:00Z`),
      category: raw,
      buildingId: text(f, "buildingId") || null,
      note: text(f, "note") || null,
    },
  };
}

export async function createExpense(f: FormData) {
  const session = await requireRole("OWNER");
  const propertyId = await currentPropertyId();
  const r = parse(f);
  if (r.error) redirect(withFlash(back(f), "err", r.error));

  await db.expense.create({ data: { ...r.data!, propertyId: propertyId, createdById: session.userId } });
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  redirect(withFlash(back(f), "ok", "บันทึกรายจ่ายแล้ว"));
}

export async function updateExpense(f: FormData) {
  const id = text(f, "id");
  await assertOwnRow("expense", id, "รายจ่าย");
  const r = parse(f);
  if (r.error) redirect(withFlash(back(f), "err", r.error));

  await db.expense.update({ where: { id }, data: r.data! });
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  redirect(withFlash(back(f), "ok", "แก้ไขรายจ่ายแล้ว"));
}

export async function deleteExpense(f: FormData) {
  const id = text(f, "id");
  await assertOwnRow("expense", id, "รายจ่าย");
  await db.expense.delete({ where: { id } });
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  redirect(withFlash(back(f), "ok", "ลบรายจ่ายแล้ว"));
}

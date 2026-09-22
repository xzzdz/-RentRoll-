"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { periodOf } from "@/lib/period";

export type SignupState = { error?: string } | undefined;

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * สมัครใช้งาน — หนึ่งครั้งได้ทั้งบัญชีเจ้าของและหอของตัวเอง
 * สร้างค่าตั้งต้นที่จำเป็นให้เลย (รอบบิล อัตราค่าน้ำ-ไฟ ประเภทห้อง ค่าบริการ)
 * ไม่งั้นเปิดเข้าไปจะออกบิลไม่ได้เลยสักอย่าง — ทุกค่าแก้ได้ในหน้าตั้งค่า
 */
export async function signup(_prev: SignupState, f: FormData): Promise<SignupState> {
  const name = text(f, "name");
  const email = text(f, "email").toLowerCase();
  const password = String(f.get("password") ?? "");
  const propertyName = text(f, "propertyName");
  const phone = text(f, "phone") || null;

  if (!name) return { error: "ใส่ชื่อของคุณ" };
  if (!EMAIL.test(email)) return { error: "อีเมลไม่ถูกต้อง" };
  if (password.length < 8) return { error: "รหัสผ่านอย่างน้อย 8 ตัวอักษร" };
  if (!propertyName) return { error: "ใส่ชื่อหอพัก" };
  if (await db.user.findUnique({ where: { email } })) return { error: "อีเมลนี้มีบัญชีอยู่แล้ว — เข้าสู่ระบบแทน" };

  const period = periodOf();
  const session = await db.$transaction(async (tx) => {
    const property = await tx.property.create({
      data: {
        name: propertyName,
        address: "",
        phone,
        billingSetting: { create: {} },
        utilityRates: {
          create: [
            { utility: "WATER", mode: "PER_UNIT", unitPrice: 18, effectiveFrom: period },
            { utility: "ELECTRIC", mode: "PER_UNIT", unitPrice: 8, effectiveFrom: period },
          ],
        },
        roomTypes: { create: [{ name: "ห้องมาตรฐาน", baseRent: 3500, deposit: 7000 }] },
        feeItems: {
          create: [
            { name: "ค่าส่วนกลาง", amount: 300, isDefault: true },
            { name: "ค่าอินเทอร์เน็ต", amount: 200, isDefault: false },
          ],
        },
      },
    });

    const user = await tx.user.create({
      data: { role: "OWNER", name, email, phone, passwordHash: await bcrypt.hash(password, 10), propertyId: property.id },
    });
    return { userId: user.id, role: user.role, name: user.name, propertyId: property.id };
  });

  await createSession(session);
  redirect("/welcome");
}

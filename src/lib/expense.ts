// ป้ายชื่อหมวดรายจ่าย — เป็น pure module ให้ client component import ได้
import type { ExpenseCategory } from "@prisma/client";

export const EXPENSE_CATEGORY: Record<ExpenseCategory, { label: string; hint: string }> = {
  UTILITY: { label: "ค่าน้ำ-ค่าไฟส่วนกลาง", hint: "บิลที่หอจ่ายให้การประปา/การไฟฟ้า" },
  SALARY: { label: "ค่าแรงพนักงาน", hint: "แม่บ้าน รปภ. ผู้ดูแล" },
  MAINTENANCE: { label: "ซ่อมบำรุงอาคาร", hint: "งานส่วนกลาง ไม่ใช่ค่าซ่อมที่เก็บจากผู้เช่า" },
  SUPPLIES: { label: "ของใช้สิ้นเปลือง", hint: "หลอดไฟ น้ำยา อุปกรณ์" },
  TAX: { label: "ภาษีและค่าธรรมเนียม", hint: "ภาษีที่ดิน ภาษีป้าย ค่าเก็บขยะ" },
  LOAN: { label: "ผ่อนธนาคาร / ดอกเบี้ย", hint: "เงินต้นและดอกเบี้ยเงินกู้" },
  MARKETING: { label: "การตลาด", hint: "ป้าย โฆษณา ค่านายหน้า" },
  OTHER: { label: "อื่น ๆ", hint: "" },
};

export const EXPENSE_CATEGORIES = Object.keys(EXPENSE_CATEGORY) as ExpenseCategory[];

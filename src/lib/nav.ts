// โครงเมนูของฝั่งเจ้าของ — ใช้ร่วมกันทั้งแถบไอคอน เมนูย่อย และเมนูมือถือ
// ไฟล์นี้ถูก import จาก client component ห้ามดึงอะไรที่แตะฐานข้อมูล
import {
  Banknote,
  BarChart3,
  Building2,
  ClipboardList,
  FileSignature,
  Gauge,
  LayoutDashboard,
  LayoutGrid,
  ReceiptText,
  Megaphone,
  MessageCircle,
  Package,
  Settings,
  Store,
  Wallet,
  Tags,
  UserCog,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; desc?: string };
export type NavGroup = { key: string; label: string; icon: LucideIcon; href: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    key: "overview",
    label: "ภาพรวม",
    icon: LayoutDashboard,
    href: "/dashboard",
    items: [{ href: "/dashboard", label: "สรุปประจำเดือน", icon: LayoutDashboard, desc: "รายรับ การเข้าพัก สิ่งที่ต้องทำ" }],
  },
  {
    key: "property",
    label: "อาคาร",
    icon: Building2,
    href: "/rooms",
    items: [
      { href: "/rooms", label: "ผังห้อง", icon: LayoutGrid, desc: "ดูสถานะห้องทั้งตึก" },
      { href: "/buildings", label: "ตึกและชั้น", icon: Building2, desc: "เพิ่ม/แก้ตึก และจัดผังแต่ละชั้น" },
      { href: "/room-types", label: "ประเภทห้อง", icon: Tags, desc: "ค่าเช่าตั้งต้นและเงินประกัน" },
    ],
  },
  {
    key: "people",
    label: "ผู้เช่า",
    icon: Users,
    href: "/tenants",
    items: [
      { href: "/tenants", label: "ผู้เช่า & สัญญา", icon: Users, desc: "รายชื่อและสถานะสัญญา" },
      { href: "/contracts/new", label: "ทำสัญญาใหม่", icon: FileSignature, desc: "รับผู้เช่าเข้าห้อง" },
      { href: "/parcels", label: "พัสดุ", icon: Package, desc: "รับฝากของ จ่ายของ และตามของค้าง" },
      { href: "/announcements", label: "บอร์ดประกาศ", icon: Megaphone, desc: "แจ้งข่าวถึงผู้เช่าทั้งหอหรือรายตึก" },
    ],
  },
  {
    key: "money",
    label: "การเงิน",
    icon: Banknote,
    href: "/billing",
    items: [
      { href: "/meters", label: "จดมิเตอร์", icon: Gauge, desc: "บันทึกเลขน้ำ-ไฟรอบนี้" },
      { href: "/billing", label: "บิล & ใบเสร็จ", icon: ReceiptText, desc: "ออกบิล รับชำระ ออกใบเสร็จ" },
      { href: "/expenses", label: "รายจ่าย", icon: Wallet, desc: "เงินที่หอจ่ายออก เพื่อดูกำไร-ขาดทุน" },
      { href: "/reports", label: "รายงาน", icon: BarChart3, desc: "สรุปรายเดือนและส่งออก Excel" },
    ],
  },
  {
    key: "maintenance",
    label: "แจ้งซ่อม",
    icon: Wrench,
    href: "/maintenance",
    items: [
      { href: "/maintenance", label: "งานซ่อม", icon: ClipboardList, desc: "ติดตามงานและมอบหมายช่าง" },
      { href: "/maintenance/new", label: "เปิดงานใหม่", icon: Wrench, desc: "แจ้งซ่อมแทนผู้เช่า" },
    ],
  },
  {
    key: "settings",
    label: "ตั้งค่า",
    icon: Settings,
    href: "/settings",
    items: [
      { href: "/settings", label: "ข้อมูลหอพัก", icon: Store, desc: "ชื่อ ที่อยู่ ข้อความท้ายใบเสร็จ" },
      { href: "/settings/rates", label: "ค่าน้ำ-ค่าไฟ", icon: Gauge, desc: "วิธีคิดและอัตราต่อหน่วย" },
      { href: "/settings/billing", label: "รอบบิล & ค่าปรับ", icon: ReceiptText, desc: "วันออกบิล ครบกำหนด ค่าปรับ" },
      { href: "/settings/fees", label: "ค่าบริการอื่น", icon: Tags, desc: "ค่าส่วนกลาง อินเทอร์เน็ต ที่จอดรถ" },
      { href: "/settings/payment", label: "ช่องทางรับเงิน", icon: Banknote, desc: "PromptPay และบัญชีธนาคาร" },
      { href: "/settings/team", label: "ผู้ใช้และช่าง", icon: UserCog, desc: "บัญชีที่เข้าระบบได้" },
      { href: "/settings/line", label: "แจ้งเตือน LINE", icon: MessageCircle, desc: "ยังเป็นตัวอย่าง — ดูว่าต้องเตรียมอะไร" },
    ],
  },
];

/** หาว่า path ปัจจุบันอยู่หมวดไหน — เทียบจากเส้นทางที่ยาวที่สุดที่ตรงกัน */
export function groupFor(pathname: string): NavGroup {
  let best: { group: NavGroup; len: number } | null = null;
  for (const g of NAV) {
    for (const i of g.items) {
      const hit = pathname === i.href || pathname.startsWith(`${i.href}/`);
      if (hit && (!best || i.href.length > best.len)) best = { group: g, len: i.href.length };
    }
  }
  return best?.group ?? NAV[0];
}

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** 5 ปุ่มล่างสุดบนมือถือ — งานที่เจ้าของทำบ่อยที่สุด */
export const MOBILE_TABS: NavItem[] = [
  { href: "/dashboard", label: "ภาพรวม", icon: LayoutDashboard },
  { href: "/rooms", label: "ผังห้อง", icon: LayoutGrid },
  { href: "/meters", label: "จดมิเตอร์", icon: Gauge },
  { href: "/billing", label: "บิล", icon: ReceiptText },
];

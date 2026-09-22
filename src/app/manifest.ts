import type { MetadataRoute } from "next";
import { BRAND } from "@/components/Logo";

/**
 * ให้ผู้เช่ากด "เพิ่มไปยังหน้าจอโฮม" แล้วได้ไอคอนกับชื่อที่ถูกต้อง
 * start_url ชี้ /t เพราะคนที่ติดตั้งลงมือถือคือผู้เช่า ส่วนเจ้าของใช้ผ่านเบราว์เซอร์เป็นหลัก
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} · ${BRAND.tagline}`,
    short_name: BRAND.name,
    description: "ดูบิล แจ้งซ่อม ดูเลขมิเตอร์ และอ่านประกาศจากหอพัก",
    start_url: "/t",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#4f46e5",
    lang: "th",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon", type: "image/png", sizes: "180x180" },
    ],
  };
}

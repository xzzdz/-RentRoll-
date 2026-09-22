import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session-token";

const OWNER_PATHS = ["/dashboard", "/welcome", "/rooms", "/buildings", "/room-types", "/tenants", "/contracts", "/parcels", "/meters", "/billing", "/expenses", "/reports", "/announcements", "/maintenance", "/settings", "/print"];
const TECH_PATHS = ["/tech"];
// ฝั่งผู้เช่า — /t/login กับ /t/line ต้องเปิดได้โดยไม่ต้องล็อกอิน ไม่งั้นเข้าระบบครั้งแรกไม่ได้
// (/t/line คือปลายทางของ LIFF ผู้เช่ายังไม่มี session ตอนเปิดมาจาก LINE)
const TENANT_ROOT = "/t";
const TENANT_PUBLIC = ["/t/login", "/t/line"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  const needOwner = OWNER_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const needTech = TECH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const needTenant =
    (pathname === TENANT_ROOT || pathname.startsWith(`${TENANT_ROOT}/`)) && !TENANT_PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // ผู้เช่ามีหน้าล็อกอินคนละหน้า จะเด้งไป /login ของเจ้าของไม่ได้
  if (needTenant && session?.role !== "TENANT") {
    const url = req.nextUrl.clone();
    url.pathname = "/t/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if ((needOwner && session?.role !== "OWNER") || (needTech && session?.role !== "TECHNICIAN" && session?.role !== "OWNER")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/welcome/:path*",
    "/rooms/:path*",
    "/buildings/:path*",
    "/room-types/:path*",
    "/tenants/:path*",
    "/contracts/:path*",
    "/parcels/:path*",
    "/meters/:path*",
    "/billing/:path*",
    "/expenses/:path*",
    "/reports/:path*",
    "/announcements/:path*",
    "/maintenance/:path*",
    "/settings/:path*",
    "/print/:path*",
    "/tech/:path*",
    "/t",
    "/t/:path*",
  ],
};

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session-token";

const OWNER_PATHS = ["/dashboard", "/rooms", "/tenants", "/contracts", "/meters", "/billing", "/expenses", "/reports", "/announcements", "/maintenance", "/settings", "/print"];
const TECH_PATHS = ["/tech"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  const needOwner = OWNER_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const needTech = TECH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

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
    "/rooms/:path*",
    "/tenants/:path*",
    "/contracts/:path*",
    "/meters/:path*",
    "/billing/:path*",
    "/expenses/:path*",
    "/reports/:path*",
    "/announcements/:path*",
    "/maintenance/:path*",
    "/settings/:path*",
    "/print/:path*",
    "/tech/:path*",
  ],
};

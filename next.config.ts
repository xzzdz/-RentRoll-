import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // bcryptjs / Prisma ใช้เฉพาะฝั่ง server
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "propertyId" TEXT;

-- CreateIndex
CREATE INDEX "User_propertyId_role_idx" ON "User"("propertyId", "role");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ผูกผู้ใช้เดิมทั้งหมดเข้ากับหอที่มีอยู่ (ระบบเดิมมีหอเดียว)
-- ทำใน migration เพื่อให้บัญชีเดิมล็อกอินได้ทันทีหลังอัปเกรด ไม่ต้องรันสคริปต์แยก
UPDATE "User"
SET "propertyId" = (SELECT "id" FROM "Property" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "propertyId" IS NULL
  AND "role" IN ('OWNER', 'TECHNICIAN')
  AND EXISTS (SELECT 1 FROM "Property");

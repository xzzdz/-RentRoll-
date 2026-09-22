-- CreateEnum
CREATE TYPE "ParcelStatus" AS ENUM ('WAITING', 'PICKED_UP', 'RETURNED');

-- CreateTable
CREATE TABLE "Parcel" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "roomId" TEXT,
    "tenantId" TEXT,
    "recipient" TEXT NOT NULL,
    "carrier" TEXT,
    "trackingNo" TEXT,
    "size" TEXT,
    "note" TEXT,
    "status" "ParcelStatus" NOT NULL DEFAULT 'WAITING',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedById" TEXT NOT NULL,
    "pickedUpAt" TIMESTAMP(3),
    "collectedBy" TEXT,
    "handedOverById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parcel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Parcel_propertyId_status_receivedAt_idx" ON "Parcel"("propertyId", "status", "receivedAt");

-- CreateIndex
CREATE INDEX "Parcel_roomId_status_idx" ON "Parcel"("roomId", "status");

-- CreateIndex
CREATE INDEX "Parcel_trackingNo_idx" ON "Parcel"("trackingNo");

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_handedOverById_fkey" FOREIGN KEY ("handedOverById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

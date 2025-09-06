/*
  Warnings:

  - You are about to drop the `Alert` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Alert" DROP CONSTRAINT "Alert_tripId_fkey";

-- DropForeignKey
ALTER TABLE "TripArea" DROP CONSTRAINT "TripArea_tripId_fkey";

-- DropForeignKey
ALTER TABLE "TripPlan" DROP CONSTRAINT "TripPlan_userId_fkey";

-- DropTable
DROP TABLE "Alert";

-- AddForeignKey
ALTER TABLE "TripPlan" ADD CONSTRAINT "TripPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripArea" ADD CONSTRAINT "TripArea_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "TripPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

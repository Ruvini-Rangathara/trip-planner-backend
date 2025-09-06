/*
  Warnings:

  - The values [ROMANTIC] on the enum `TravelType` will be removed. If these variants are still used in the database, this will fail.
  - The values [SUGGESTED,ACCEPTED,REJECTED] on the enum `TripStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `createdAt` on the `TripPlan` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `TripPlan` table. All the data in the column will be lost.
  - You are about to drop the `Destination` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Feedback` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ItineraryItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RealTimeReschedule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Region` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TripSuggestion` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `title` to the `TripPlan` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('DUE_DATE', 'WEATHER', 'SUGGESTION');

-- AlterEnum
BEGIN;
CREATE TYPE "TravelType_new" AS ENUM ('LEISURE', 'ADVENTURE', 'FAMILY', 'CULTURAL');
ALTER TABLE "User" ALTER COLUMN "travelType" TYPE "TravelType_new" USING ("travelType"::text::"TravelType_new");
ALTER TYPE "TravelType" RENAME TO "TravelType_old";
ALTER TYPE "TravelType_new" RENAME TO "TravelType";
DROP TYPE "TravelType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TripStatus_new" AS ENUM ('PLANNED', 'ONGOING', 'COMPLETED');
ALTER TABLE "TripPlan" ALTER COLUMN "status" TYPE "TripStatus_new" USING ("status"::text::"TripStatus_new");
ALTER TYPE "TripStatus" RENAME TO "TripStatus_old";
ALTER TYPE "TripStatus_new" RENAME TO "TripStatus";
DROP TYPE "TripStatus_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Destination" DROP CONSTRAINT "Destination_regionId_fkey";

-- DropForeignKey
ALTER TABLE "Feedback" DROP CONSTRAINT "Feedback_tripId_fkey";

-- DropForeignKey
ALTER TABLE "ItineraryItem" DROP CONSTRAINT "ItineraryItem_destinationId_fkey";

-- DropForeignKey
ALTER TABLE "ItineraryItem" DROP CONSTRAINT "ItineraryItem_tripId_fkey";

-- DropForeignKey
ALTER TABLE "RealTimeReschedule" DROP CONSTRAINT "RealTimeReschedule_newDestinationId_fkey";

-- DropForeignKey
ALTER TABLE "RealTimeReschedule" DROP CONSTRAINT "RealTimeReschedule_oldDestinationId_fkey";

-- DropForeignKey
ALTER TABLE "RealTimeReschedule" DROP CONSTRAINT "RealTimeReschedule_tripId_fkey";

-- DropForeignKey
ALTER TABLE "TripSuggestion" DROP CONSTRAINT "TripSuggestion_tripId_fkey";

-- AlterTable
ALTER TABLE "TripPlan" DROP COLUMN "createdAt",
DROP COLUMN "deletedAt",
ADD COLUMN     "title" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PLANNED';

-- DropTable
DROP TABLE "Destination";

-- DropTable
DROP TABLE "Feedback";

-- DropTable
DROP TABLE "ItineraryItem";

-- DropTable
DROP TABLE "RealTimeReschedule";

-- DropTable
DROP TABLE "Region";

-- DropTable
DROP TABLE "TripSuggestion";

-- DropEnum
DROP TYPE "ClimateType";

-- DropEnum
DROP TYPE "RescheduleReason";

-- DropEnum
DROP TYPE "SuggestionStatus";

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "district" TEXT,
    "isIndoor" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripArea" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,

    CONSTRAINT "TripArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TripArea" ADD CONSTRAINT "TripArea_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "TripPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripArea" ADD CONSTRAINT "TripArea_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "TripPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

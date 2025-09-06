/*
  Warnings:

  - You are about to drop the column `areaId` on the `TripArea` table. All the data in the column will be lost.
  - You are about to drop the `Area` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `area` to the `TripArea` table without a default value. This is not possible if the table is not empty.
  - Added the required column `latitude` to the `TripArea` table without a default value. This is not possible if the table is not empty.
  - Added the required column `longitude` to the `TripArea` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "TripArea" DROP CONSTRAINT "TripArea_areaId_fkey";

-- AlterTable
ALTER TABLE "TripArea" DROP COLUMN "areaId",
ADD COLUMN     "area" TEXT NOT NULL,
ADD COLUMN     "latitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "longitude" DOUBLE PRECISION NOT NULL;

-- DropTable
DROP TABLE "Area";

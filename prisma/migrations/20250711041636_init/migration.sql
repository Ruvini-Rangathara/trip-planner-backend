-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateTable
CREATE TABLE "User" (
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "travel_type" TEXT,
    "climate_preference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "TripPlan" (
    "trip_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripPlan_pkey" PRIMARY KEY ("trip_id")
);

-- CreateTable
CREATE TABLE "TripSuggestion" (
    "suggestion_id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "suggestion_number" INTEGER NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,

    CONSTRAINT "TripSuggestion_pkey" PRIMARY KEY ("suggestion_id")
);

-- CreateTable
CREATE TABLE "Region" (
    "region_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("region_id")
);

-- CreateTable
CREATE TABLE "Destination" (
    "destination_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region_id" TEXT NOT NULL,
    "climate_type" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Destination_pkey" PRIMARY KEY ("destination_id")
);

-- CreateTable
CREATE TABLE "ItineraryItem" (
    "item_id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "destination_id" TEXT NOT NULL,
    "day_number" INTEGER NOT NULL,
    "activity_time" TEXT NOT NULL,
    "activity_description" TEXT NOT NULL,

    CONSTRAINT "ItineraryItem_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "RealTimeReschedule" (
    "reschedule_id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "old_destination_id" TEXT NOT NULL,
    "new_destination_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "rescheduled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RealTimeReschedule_pkey" PRIMARY KEY ("reschedule_id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "feedback_id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comments" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("feedback_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_trip_id_key" ON "Feedback"("trip_id");

-- AddForeignKey
ALTER TABLE "TripPlan" ADD CONSTRAINT "TripPlan_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripSuggestion" ADD CONSTRAINT "TripSuggestion_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "TripPlan"("trip_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Destination" ADD CONSTRAINT "Destination_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "Region"("region_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryItem" ADD CONSTRAINT "ItineraryItem_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "TripPlan"("trip_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryItem" ADD CONSTRAINT "ItineraryItem_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "Destination"("destination_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealTimeReschedule" ADD CONSTRAINT "RealTimeReschedule_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "TripPlan"("trip_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealTimeReschedule" ADD CONSTRAINT "RealTimeReschedule_old_destination_id_fkey" FOREIGN KEY ("old_destination_id") REFERENCES "Destination"("destination_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealTimeReschedule" ADD CONSTRAINT "RealTimeReschedule_new_destination_id_fkey" FOREIGN KEY ("new_destination_id") REFERENCES "Destination"("destination_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "TripPlan"("trip_id") ON DELETE RESTRICT ON UPDATE CASCADE;

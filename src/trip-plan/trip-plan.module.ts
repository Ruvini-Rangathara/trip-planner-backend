import { Module } from '@nestjs/common';
import { TripPlanController } from './trip-plan.controller';
import { TripPlanService } from './trip-plan.service';
import { PlacesModule } from 'src/places/places.module';
import { WeatherModule } from 'src/weather/weather.module';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Module({
  imports: [PlacesModule, WeatherModule, PrismaModule],
  controllers: [TripPlanController],
  providers: [TripPlanService, PrismaService],
})
export class TripPlanModule {}

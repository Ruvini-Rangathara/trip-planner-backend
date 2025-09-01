import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ForecastController } from './forecast.controller';
import { ForecastService } from './forecast.service';
import { GeocodeService } from './geocode.service';

@Module({
  imports: [ConfigModule, HttpModule],
  controllers: [ForecastController],
  providers: [ForecastService, GeocodeService],
})
export class WeatherModule {}

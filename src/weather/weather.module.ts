// src/weather/weather.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ForecastController } from './forecast.controller';
import { ForecastService } from './forecast.service';
import { GeocodeService } from './geocode.service';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [ForecastController],
  providers: [ForecastService, GeocodeService],
  exports: [ForecastService, GeocodeService],
})
export class WeatherModule {}

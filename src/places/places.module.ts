// src/places/places.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PlacesController } from './places.controller';
import { OverpassService } from './overpass.service';
import { PlacesSuggestService } from './places-suggest.service';
import { PlacesWeatherService } from './places-weather.service';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [PlacesController],
  providers: [OverpassService, PlacesSuggestService, PlacesWeatherService],
  exports: [PlacesSuggestService, OverpassService, PlacesWeatherService],
})
export class PlacesModule {}

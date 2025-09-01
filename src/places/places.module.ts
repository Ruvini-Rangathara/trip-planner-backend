import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { OverpassService } from './overpass.service';
import { PlacesController } from './places.controller';

@Module({
  imports: [ConfigModule, HttpModule],
  controllers: [PlacesController],
  providers: [OverpassService],
})
export class PlacesModule {}

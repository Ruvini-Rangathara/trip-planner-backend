import { Controller, Post, Query } from '@nestjs/common';
import { OverpassService, Place } from './overpass.service';
import { NearbyPlacesDto, SuggestPlacesDto } from './dto';
import { PlacesSuggestService } from './places-suggest.service';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

type Activity = 'beach' | 'hike' | 'city';
export interface PlaceSuggestion {
  place: Place;
  activity: Activity;
  score: number;
  summary: {
    goodDays: number;
    days: number;
    sumRain: number;
    avgT: number;
    maxRainHi: number;
    maxTHi: number;
  };
}

function validate<T>(cls: new () => T, obj: Record<string, unknown>): T {
  const dto = plainToInstance(cls, obj, { enableImplicitConversion: true });
  const errors = validateSync(dto as unknown as object);
  if (errors.length) {
    const e = errors
      .map((x) => Object.values(x.constraints ?? {}))
      .flat()
      .join('; ');
    throw new Error(e || 'Validation failed');
  }
  return dto;
}

@ApiTags('Places')
@Controller('/places')
export class PlacesController {
  constructor(
    private overpass: OverpassService,
    private suggestSvc: PlacesSuggestService, // ⬅️ new
  ) {}

  @Post('nearby')
  @ApiOperation({
    summary: 'Find nearby travel places within a radius (default 20km)',
  })
  @ApiQuery({ name: 'lat', required: true, example: 6.9271 })
  @ApiQuery({ name: 'lon', required: true, example: 79.8612 })
  @ApiQuery({ name: 'radius', required: false, example: 20000 })
  @ApiQuery({
    name: 'kinds',
    required: false,
    example: 'tourism,natural,historic,park',
    description: 'Comma list: tourism | natural | historic | park',
  })
  @ApiOkResponse({
    description: 'List of nearby travel POIs sorted by distance',
  })
  async nearby(
    @Query() q: Record<string, unknown>,
  ): Promise<ApiEnvelope<Place[]>> {
    const dto = validate(NearbyPlacesDto, q);
    const list = await this.overpass.nearbyTravelPlaces(
      dto.lat,
      dto.lon,
      dto.radius ?? 20000,
      dto.kinds,
    );
    return { code: 200, message: 'OK', data: list };
  }

  /** ---------- New: weather-filtered suggestions ---------- */
  @Post('suggest')
  @ApiOperation({
    summary: 'Suggest nearby travel places filtered by predicted weather',
  })
  @ApiQuery({ name: 'lat', required: true, example: 6.9271 })
  @ApiQuery({ name: 'lon', required: true, example: 79.8612 })
  @ApiQuery({ name: 'radius', required: false, example: 20000 })
  @ApiQuery({ name: 'start', required: false, example: '2025-09-10' })
  @ApiQuery({ name: 'end', required: false, example: '2025-09-12' })
  @ApiQuery({ name: 'minGoodDays', required: false, example: 1 })
  @ApiQuery({
    name: 'kinds',
    required: false,
    example: 'tourism,natural,historic,park',
    description: 'Filter which place kinds to consider',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 40,
    description: 'Max number of nearest places to weather-check',
  })
  @ApiOkResponse({
    description: 'Ranked list of good-weather places near the point',
  })
  async suggest(
    @Query() q: Record<string, unknown>,
  ): Promise<ApiEnvelope<PlaceSuggestion[]>> {
    const dto = validate(SuggestPlacesDto, q);
    const res = await this.suggestSvc.suggest({
      lat: dto.lat,
      lon: dto.lon,
      radius: dto.radius,
      kinds: dto.kinds,
      start: dto.start,
      end: dto.end,
      minGoodDays: dto.minGoodDays,
      limit: dto.limit,
    });
    return { code: 200, message: 'OK', data: res as PlaceSuggestion[] };
  }
}

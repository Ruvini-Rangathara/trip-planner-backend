import { Controller, Post, Query } from '@nestjs/common';
import { OverpassService, Place } from './overpass.service';
import { NearbyPlacesDto } from './dto';
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
@Controller('api/places')
export class PlacesController {
  constructor(private overpass: OverpassService) {}

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
}

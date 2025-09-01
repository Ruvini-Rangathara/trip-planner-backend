// src/weather/forecast.controller.ts
import { BadRequestException, Controller, Post, Query } from '@nestjs/common';
import {
  ForecastService,
  ApiEnvelope,
  ForecastPayload,
  HistoryPayload,
  CurrentWeather, // ⬅️ add
} from './forecast.service';
import { GeocodeService, GeocodeHit } from './geocode.service';
import { ByCoordsDto, ByNameDto } from './dto';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';

/** Swagger-only response wrappers (classes so Nest can generate schemas) */
class LatLon {
  lat!: number;
  lon!: number;
}
class LocationInfo {
  requested?: LatLon;
  snapped?: LatLon | null;
  mode?: 'snapped' | 'interpolated';
  neighbors?: LatLon[];
}
class ForecastWindow {
  start!: string;
  end!: string;
}
class ForecastDaily {
  date!: string;
  t2m?: number;
  t2m_lo?: number;
  t2m_hi?: number;
  t2m_model?: string;
  precip?: number;
  precip_lo?: number;
  precip_hi?: number;
  precip_model?: string;
}
class ForecastData {
  location!: LocationInfo;
  forecast_window!: ForecastWindow;
  daily!: ForecastDaily[];
}
class HistoryDaily {
  date!: string;
  t2m?: number | null;
  precip?: number | null;
  t2m_model?: string;
  precip_model?: string;
}
class HistoryData {
  location!: LocationInfo;
  daily!: HistoryDaily[];
}
class ForecastEnvelope {
  code!: number;
  message!: string;
  data!: ForecastData;
}
class HistoryEnvelope {
  code!: number;
  message!: string;
  data!: HistoryData;
}

interface PlaceResolved {
  query: string;
  resolved: string;
  lat: number;
  lon: number;
}

function validate<T>(cls: new () => T, obj: Record<string, unknown>): T {
  const dto = plainToInstance(cls, obj, { enableImplicitConversion: true });
  const errors = validateSync(dto as unknown as object);
  if (errors.length) throw new BadRequestException(errors);
  return dto;
}

@ApiTags('Weather')
@ApiExtraModels(
  ForecastEnvelope,
  HistoryEnvelope,
  ForecastData,
  HistoryData,
  ForecastDaily,
  HistoryDaily,
  LocationInfo,
  ForecastWindow,
  LatLon,
)
@Controller('api')
export class ForecastController {
  constructor(
    private fc: ForecastService,
    private geo: GeocodeService,
  ) {}

  @Post('forecast/by-coords')
  @ApiOperation({ summary: '30-day forecast by coordinates' })
  @ApiQuery({ name: 'lat', required: true, example: 6.9271 })
  @ApiQuery({ name: 'lon', required: true, example: 79.8612 })
  @ApiQuery({ name: 'date', required: false, example: '2025-09-15' })
  @ApiQuery({ name: 'vars', required: false, example: 'T2M,PRECIP' })
  @ApiQuery({
    name: 'interp',
    required: false,
    enum: ['0', '1'],
    example: '1',
    description: 'Bilinear interpolation',
  })
  @ApiOkResponse({
    schema: { $ref: getSchemaPath(ForecastEnvelope) },
  })
  async byCoords(
    @Query() q: Record<string, unknown>,
  ): Promise<ApiEnvelope<ForecastPayload>> {
    const dto = validate(ByCoordsDto, q);
    const interp: '0' | '1' = dto.interp ?? '1';
    return this.fc.forecastByCoords(dto.lat, dto.lon, {
      date: dto.date,
      vars: dto.vars,
      interp,
    });
  }

  @Post('forecast/by-name')
  @ApiOperation({ summary: '30-day forecast by place name (Sri Lanka)' })
  @ApiQuery({ name: 'q', required: true, example: 'Ella' })
  @ApiQuery({ name: 'date', required: false, example: '2025-09-15' })
  @ApiQuery({ name: 'vars', required: false, example: 'T2M,PRECIP' })
  @ApiQuery({ name: 'interp', required: false, enum: ['0', '1'], example: '1' })
  @ApiOkResponse({
    schema: {
      allOf: [
        { $ref: getSchemaPath(ForecastEnvelope) },
        {
          properties: {
            data: {
              allOf: [
                { $ref: getSchemaPath(ForecastData) },
                {
                  properties: {
                    place: {
                      type: 'object',
                      properties: {
                        query: { type: 'string', example: 'Ella' },
                        resolved: { type: 'string' },
                        lat: { type: 'number' },
                        lon: { type: 'number' },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    },
  })
  async byName(
    @Query() q: Record<string, unknown>,
  ): Promise<ApiEnvelope<ForecastPayload & { place: PlaceResolved }>> {
    const dto = validate(ByNameDto, q);
    const hit: GeocodeHit = await this.geo.geocodeLK(dto.q);
    const interp: '0' | '1' = dto.interp ?? '1';
    const res = await this.fc.forecastByCoords(hit.lat, hit.lon, {
      date: dto.date,
      vars: dto.vars,
      interp,
    });
    const place: PlaceResolved = {
      query: dto.q,
      resolved: hit.name,
      lat: hit.lat,
      lon: hit.lon,
    };
    return {
      code: res.code,
      message: res.message,
      data: { ...res.data, place },
    };
  }

  @Post('history/by-coords')
  @ApiOperation({ summary: 'Historical daily value by coordinates (one date)' })
  @ApiQuery({ name: 'lat', required: true, example: 6.9271 })
  @ApiQuery({ name: 'lon', required: true, example: 79.8612 })
  @ApiQuery({ name: 'date', required: true, example: '2024-08-15' })
  @ApiQuery({ name: 'vars', required: false, example: 'T2M,PRECIP' })
  @ApiQuery({ name: 'interp', required: false, enum: ['0', '1'], example: '1' })
  @ApiOkResponse({ schema: { $ref: getSchemaPath(HistoryEnvelope) } })
  async histCoords(
    @Query() q: Record<string, unknown>,
  ): Promise<ApiEnvelope<HistoryPayload>> {
    if (typeof q.date !== 'string' || !q.date)
      throw new BadRequestException('date is required YYYY-MM-DD');
    const dto = validate(ByCoordsDto, q);
    const interp: '0' | '1' = dto.interp ?? '1';
    return this.fc.historyByCoords(dto.lat, dto.lon, q.date, {
      vars: dto.vars,
      interp,
    });
  }

  @Post('history/by-name')
  @ApiOperation({
    summary: 'Historical daily value by place name (one date, Sri Lanka)',
  })
  @ApiQuery({ name: 'q', required: true, example: 'Sigiriya' })
  @ApiQuery({ name: 'date', required: true, example: '2024-08-15' })
  @ApiQuery({ name: 'vars', required: false, example: 'T2M,PRECIP' })
  @ApiQuery({ name: 'interp', required: false, enum: ['0', '1'], example: '1' })
  @ApiOkResponse({
    schema: {
      allOf: [
        { $ref: getSchemaPath(HistoryEnvelope) },
        {
          properties: {
            data: {
              allOf: [
                { $ref: getSchemaPath(HistoryData) },
                {
                  properties: {
                    place: {
                      type: 'object',
                      properties: {
                        query: { type: 'string', example: 'Sigiriya' },
                        resolved: { type: 'string' },
                        lat: { type: 'number' },
                        lon: { type: 'number' },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    },
  })
  async histName(
    @Query() q: Record<string, unknown>,
  ): Promise<ApiEnvelope<HistoryPayload & { place: PlaceResolved }>> {
    if (typeof q.date !== 'string' || !q.date)
      throw new BadRequestException('date is required YYYY-MM-DD');
    const dto = validate(ByNameDto, q);
    const hit: GeocodeHit = await this.geo.geocodeLK(dto.q);
    const interp: '0' | '1' = dto.interp ?? '1';
    const res = await this.fc.historyByCoords(hit.lat, hit.lon, q.date, {
      vars: dto.vars,
      interp,
    });
    const place: PlaceResolved = {
      query: dto.q,
      resolved: hit.name,
      lat: hit.lat,
      lon: hit.lon,
    };
    return {
      code: res.code,
      message: res.message,
      data: { ...res.data, place },
    };
  }

  /** ---------------- Current (OpenWeather) ---------------- */

  @Post('current/by-coords')
  @ApiOperation({ summary: 'Current weather by coordinates (OpenWeather)' })
  @ApiQuery({ name: 'lat', required: true, example: 6.9271 })
  @ApiQuery({ name: 'lon', required: true, example: 79.8612 })
  @ApiOkResponse({
    description: 'OpenWeather current conditions (normalized envelope)',
  })
  async currentByCoords(
    @Query() q: Record<string, unknown>,
  ): Promise<ApiEnvelope<CurrentWeather>> {
    const dto = validate(ByCoordsDto, q); // reuses your coords DTO
    return this.fc.currentByCoords(dto.lat, dto.lon);
  }

  @Post('current/by-name')
  @ApiOperation({
    summary: 'Current weather by place name in Sri Lanka (OpenWeather)',
  })
  @ApiQuery({ name: 'q', required: true, example: 'Colombo' })
  @ApiOkResponse({
    description: 'OpenWeather current conditions + resolved place',
  })
  async currentByName(
    @Query() q: Record<string, unknown>,
  ): Promise<
    ApiEnvelope<CurrentWeather & { place: { query: string; resolved: string } }>
  > {
    const dto = validate(ByNameDto, q);
    const hit: GeocodeHit = await this.geo.geocodeLK(dto.q);
    const res = await this.fc.currentByCoords(hit.lat, hit.lon);
    return {
      code: res.code,
      message: res.message,
      data: { ...res.data, place: { query: dto.q, resolved: hit.name } },
    };
  }
}

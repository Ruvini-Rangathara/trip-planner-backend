import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TripPlanService } from './trip-plan.service';
import { CreateTripPlanDto } from './dto/create-trip-plan.dto';
import { UpdateTripPlanDto } from './dto/update-trip-plan.dto';
import { DeleteTripPlanDto } from './dto/delete-trip-plan.dto';
import {
  GetAllTripPlanRequestDto,
  GetOneTripPlanRequestDto,
} from './dto/get-trip-plan.dto';
import { TripPlanDto } from './dto/trip-plan.dto';

interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

@ApiTags('Trip Plans')
@Controller('/trip-plans')
export class TripPlanController {
  constructor(private readonly svc: TripPlanService) {}

  /** CREATE */
  @Post('create')
  @ApiOperation({ summary: 'Create a trip plan' })
  @ApiOkResponse({ type: TripPlanDto })
  async create(
    @Body() dto: CreateTripPlanDto,
  ): Promise<ApiEnvelope<TripPlanDto>> {
    const data = await this.svc.create(dto);
    return { code: 200, message: 'OK', data };
  }

  /** UPDATE */
  @Post('update')
  @ApiOperation({ summary: 'Update a trip plan (id required)' })
  @ApiOkResponse({ type: TripPlanDto })
  async update(
    @Body() dto: UpdateTripPlanDto,
  ): Promise<ApiEnvelope<TripPlanDto>> {
    const data = await this.svc.update(dto);
    return { code: 200, message: 'OK', data };
  }

  /** DELETE */
  @Post('delete')
  @ApiOperation({
    summary: 'Delete a trip plan (hard delete with areas & alerts)',
  })
  async remove(
    @Body() dto: DeleteTripPlanDto,
  ): Promise<ApiEnvelope<{ id: string }>> {
    const data = await this.svc.remove(dto.id);
    return { code: 200, message: 'OK', data };
  }

  /** GET ONE (POST) */
  @Post('get-one')
  @ApiOperation({ summary: 'Get one trip plan with areas & alerts' })
  @ApiOkResponse({ type: TripPlanDto })
  async getOne(
    @Body() dto: GetOneTripPlanRequestDto,
  ): Promise<ApiEnvelope<TripPlanDto>> {
    const data = await this.svc.getOne({ id: dto.id });
    return { code: 200, message: 'OK', data };
  }

  /** LIST BY USER (POST) */
  @Post('list')
  @ApiOperation({
    summary: 'List user trip plans filtered by time (old|future|all)',
  })
  async list(
    @Body() dto: GetAllTripPlanRequestDto,
  ): Promise<ApiEnvelope<TripPlanDto[]>> {
    const data = await this.svc.listByUser(dto.userId, dto.when ?? 'all');
    return { code: 200, message: 'OK', data };
  }

  /** REPLACE AREAS (POST) */
  @Post('areas:replace')
  @ApiOperation({
    summary:
      'Replace areas for a trip (transactional) and log a suggestion alert',
  })
  @ApiOkResponse({ type: TripPlanDto })
  async replaceAreas(
    @Body()
    body: {
      tripId: string;
      areas: { area: string; latitude: number; longitude: number }[];
    },
  ): Promise<ApiEnvelope<TripPlanDto>> {
    const data = await this.svc.replaceAreas(body.tripId, body.areas ?? []);
    return { code: 200, message: 'OK', data };
  }

  /** SUGGESTIONS / FORECAST (POST) */
  @Post('request')
  @ApiOperation({
    summary: 'Suggest nearby places or fetch forecast for area/date',
    description:
      '- If no area → suggestions near lat/lon (filtered by weather).\n' +
      '- If area + date → one-day forecast.\n' +
      '- If area only → 30-day forecast.',
  })
  async request(
    @Body()
    body: {
      place?: string; // “Galle” etc — used to geocode lat/lon when missing
      lat?: number;
      lon?: number;
      area?: string; // when set, forecasts this area
      date?: string; // YYYY-MM-DD (optional)
    },
  ): Promise<ApiEnvelope<any>> {
    return this.svc.requestTripPlan(body);
  }
}

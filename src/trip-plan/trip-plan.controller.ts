// src/trip-plan/trip-plan.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { TripPlanService } from './trip-plan.service';
import { CreateTripPlanDto } from './dto/create-trip-plan.dto';
import { UpdateTripPlanDto } from './dto/update-trip-plan.dto';
import { DeleteTripPlanDto } from './dto/delete-trip-plan.dto';
// ⬇️ use GetOneTripPlanRequestDto (there is no GetTripPlanDto)
import { GetOneTripPlanRequestDto } from './dto/get-trip-plan.dto';
import { TripPlanDto } from './dto/trip-plan.dto';

interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

@ApiTags('Trip Plans')
@Controller('api/trip-plans')
export class TripPlanController {
  constructor(private readonly svc: TripPlanService) {}

  @Post()
  @ApiOperation({ summary: 'Create a trip plan' })
  @ApiOkResponse({ type: TripPlanDto })
  async create(
    @Body() dto: CreateTripPlanDto,
  ): Promise<ApiEnvelope<TripPlanDto>> {
    const data = await this.svc.create(dto);
    return { code: 200, message: 'OK', data };
  }

  @Patch()
  @ApiOperation({ summary: 'Update a trip plan (id required)' })
  @ApiOkResponse({ type: TripPlanDto })
  async update(
    @Body() dto: UpdateTripPlanDto,
  ): Promise<ApiEnvelope<TripPlanDto>> {
    const data = await this.svc.update(dto);
    return { code: 200, message: 'OK', data };
  }

  @Delete()
  @ApiOperation({
    summary: 'Delete a trip plan (hard delete with areas & alerts)',
  })
  async remove(
    @Body() dto: DeleteTripPlanDto,
  ): Promise<ApiEnvelope<{ id: string }>> {
    const data = await this.svc.remove(dto.id);
    return { code: 200, message: 'OK', data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one trip plan with areas & alerts' })
  @ApiOkResponse({ type: TripPlanDto })
  async getOne(
    @Param('id') id: GetOneTripPlanRequestDto['id'],
  ): Promise<ApiEnvelope<TripPlanDto>> {
    // ⬇️ TripPlanService has getOne(dto), not findOne(...)
    const data = await this.svc.getOne({ id });
    return { code: 200, message: 'OK', data };
  }

  @Get()
  @ApiOperation({
    summary: 'List user trip plans filtered by time (old|future|all)',
  })
  @ApiQuery({ name: 'userId', required: true })
  @ApiQuery({
    name: 'when',
    required: false,
    enum: ['old', 'future', 'all'],
    example: 'all',
  })
  async list(
    @Query('userId') userId: string,
    @Query('when') when: 'old' | 'future' | 'all' = 'all',
  ): Promise<ApiEnvelope<TripPlanDto[]>> {
    const data = await this.svc.listByUser(userId, when);
    return { code: 200, message: 'OK', data };
  }

  @Post(':id/areas:replace')
  @ApiOperation({
    summary:
      'Replace areas for a trip (transactional) and log a suggestion alert',
  })
  @ApiOkResponse({ type: TripPlanDto })
  async replaceAreas(
    @Param('id') id: string,
    @Body()
    body: { areas: { area: string; latitude: number; longitude: number }[] },
  ): Promise<ApiEnvelope<TripPlanDto>> {
    const data = await this.svc.replaceAreas(id, body.areas ?? []);
    return { code: 200, message: 'OK', data };
  }

  @Post('request')
  @ApiOperation({
    summary: 'Suggest a trip plan or fetch forecast for a chosen area/date',
    description:
      'If no area is provided, returns nearby suggestions within 30km filtered by predicted weather. ' +
      'If area is provided with date → one-day forecast. If area and no date → 30-day forecast.',
  })
  async request(
    @Body()
    body: {
      place?: string;
      lat?: number;
      lon?: number;
      area?: string;
      date?: string;
    },
  ): Promise<ApiEnvelope<any>> {
    const res = await this.svc.requestTripPlan(body);
    return res;
  }
}

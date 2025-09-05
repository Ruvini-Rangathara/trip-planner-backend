// src/trip-plan/trip-plan.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TripPlanService } from './trip-plan.service';

import { CreateTripPlanDto } from './dto/create-trip-plan.dto';
import { UpdateTripPlanDto } from './dto/update-trip-plan.dto';
import { DeleteTripPlanDto } from './dto/delete-trip-plan.dto';
import {
  GetAllTripPlanRequestDto,
  GetAllTripPlanResponseDto,
  GetOneTripPlanRequestDto,
  GetOneTripPlanResponseDto,
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
  @ApiOperation({
    summary: 'Create a trip plan (must include at least one area)',
  })
  @ApiOkResponse({ type: TripPlanDto })
  async create(
    @Body() dto: CreateTripPlanDto,
  ): Promise<ApiEnvelope<TripPlanDto>> {
    const data = await this.svc.create(dto);
    return { code: 200, message: 'OK', data };
  }

  /** UPDATE (areas diffed transactionally in service) */
  @Post('update')
  @ApiOperation({
    summary:
      'Update a trip plan. If "areas" is provided, new areas are created, removed ones are deleted; existing (same name) are kept.',
  })
  @ApiOkResponse({ type: TripPlanDto })
  async update(
    @Body() dto: UpdateTripPlanDto,
  ): Promise<ApiEnvelope<TripPlanDto>> {
    const data = await this.svc.update(dto);
    return { code: 200, message: 'OK', data };
  }

  /** DELETE */
  @Post('delete')
  @ApiOperation({ summary: 'Delete a trip plan (cascades TripArea rows)' })
  async remove(
    @Body() dto: DeleteTripPlanDto,
  ): Promise<ApiEnvelope<{ id: string }>> {
    const data = await this.svc.remove(dto.id);
    return { code: 200, message: 'OK', data };
  }

  /** GET ONE */
  @Post('get-one')
  @ApiOperation({ summary: 'Get one trip plan with areas' })
  @ApiOkResponse({ type: GetOneTripPlanResponseDto })
  async getOne(
    @Body() dto: GetOneTripPlanRequestDto,
  ): Promise<ApiEnvelope<GetOneTripPlanResponseDto>> {
    const data = await this.svc.getOne({ id: dto.id });
    return { code: 200, message: 'OK', data };
  }

  /** GET ALL (paged) */
  @Post('get-all')
  @ApiOperation({
    summary:
      'Get all trip plans for a user (paged). Filter by time with when=old|future|all',
  })
  @ApiOkResponse({ type: GetAllTripPlanResponseDto })
  async getAll(
    @Body() dto: GetAllTripPlanRequestDto,
  ): Promise<ApiEnvelope<GetAllTripPlanResponseDto>> {
    const data = await this.svc.getAll(dto);
    return { code: 200, message: 'OK', data };
  }
}

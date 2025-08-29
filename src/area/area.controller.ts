// src/area/area.controller.ts
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AreaService } from './area.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { DeleteAreaDto } from './dto/delete-area.dto';
import {
  GetAllAreaRequestDto,
  GetAllAreaResponseDto,
  GetOneAreaRequestDto,
  GetOneAreaResponseDto,
} from './dto/get-area.dto';
import { ApiResponses } from 'src/common/decorator/api/api-responses.decorator';

@ApiTags('Area')
@Controller('area')
export class AreaController {
  constructor(private readonly areaService: AreaService) {}

  @HttpCode(200)
  @Post('create')
  @ApiBody({
    type: CreateAreaDto,
    description: 'Data required to create a new Area',
  })
  @ApiOperation({ description: 'Create an Area' })
  @ApiResponses({
    okResponse: 'Area created successfully',
    badRequestResponse: 'Invalid input data',
    unauthorizedResponse: 'User is not authenticated',
    internalServerErrorResponse: 'An internal server error occurred',
  })
  @ApiBearerAuth()
  async create(@Body() dto: CreateAreaDto) {
    return this.areaService.create(dto);
  }

  @HttpCode(200)
  @Post('update')
  @ApiBody({
    type: UpdateAreaDto,
    description: 'Data required to update an Area',
  })
  @ApiOperation({ description: 'Update an Area' })
  @ApiResponses({
    okResponse: 'Area updated successfully',
    badRequestResponse: 'Invalid input data',
    unauthorizedResponse: 'User is not authenticated',
    internalServerErrorResponse: 'An internal server error occurred',
  })
  @ApiBearerAuth()
  async update(@Body() dto: UpdateAreaDto) {
    return this.areaService.update(dto);
  }

  @HttpCode(200)
  @Post('delete')
  @ApiBody({
    type: DeleteAreaDto,
    description: 'ID of the Area to delete',
  })
  @ApiOperation({ description: 'Delete an Area' })
  @ApiResponses({
    okResponse: 'Area deleted successfully',
    badRequestResponse: 'Invalid input data',
    unauthorizedResponse: 'User is not authenticated',
    internalServerErrorResponse: 'An internal server error occurred',
  })
  @ApiBearerAuth()
  async delete(@Body() dto: DeleteAreaDto) {
    return this.areaService.delete(dto);
  }

  @HttpCode(200)
  @Post('get-all')
  @ApiBody({
    type: GetAllAreaRequestDto,
    description: 'Pagination params to list Areas',
  })
  @ApiOperation({ description: 'Get all Areas' })
  @ApiResponse({
    status: 200,
    description: 'Retrieved all Areas successfully',
    type: GetAllAreaResponseDto,
  })
  @ApiBearerAuth()
  async getAll(@Body() dto: GetAllAreaRequestDto) {
    return this.areaService.getAll(dto);
  }

  @HttpCode(200)
  @Post('get-one')
  @ApiBody({
    type: GetOneAreaRequestDto,
    description: 'ID of the Area to retrieve',
  })
  @ApiOperation({ description: 'Get a single Area' })
  @ApiResponse({
    status: 200,
    description: 'Retrieved Area successfully',
    type: GetOneAreaResponseDto,
  })
  @ApiBearerAuth()
  async getOne(@Body() dto: GetOneAreaRequestDto) {
    return this.areaService.getOne(dto);
  }
}

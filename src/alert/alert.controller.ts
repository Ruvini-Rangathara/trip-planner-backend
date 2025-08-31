import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AlertService } from './alert.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { DeleteAlertDto } from './dto/delete-alert.dto';
import {
  GetAllAlertRequestDto,
  GetAllAlertResponseDto,
  GetOneAlertRequestDto,
  GetOneAlertResponseDto,
} from './dto/get-alert.dto';
import { ApiResponses } from 'src/common/decorator/api/api-responses.decorator';

@ApiTags('Alerts')
@Controller('alert')
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  @HttpCode(200)
  @Post('create')
  @ApiBody({ type: CreateAlertDto })
  @ApiOperation({ description: 'Create a new alert' })
  @ApiResponses({
    okResponse: 'Alert created successfully',
    badRequestResponse: 'Invalid input data',
    unauthorizedResponse: 'User is not authenticated',
    internalServerErrorResponse: 'An internal server error occurred',
  })
  @ApiBearerAuth()
  async create(@Body() dto: CreateAlertDto) {
    return this.alertService.create(dto);
  }

  @HttpCode(200)
  @Post('update')
  @ApiBody({ type: UpdateAlertDto })
  @ApiOperation({ description: 'Update an existing alert' })
  @ApiResponses({
    okResponse: 'Alert updated successfully',
    badRequestResponse: 'Invalid input data',
    unauthorizedResponse: 'User is not authenticated',
    internalServerErrorResponse: 'An internal server error occurred',
  })
  @ApiBearerAuth()
  async update(@Body() dto: UpdateAlertDto) {
    return this.alertService.update(dto);
  }

  @HttpCode(200)
  @Post('delete')
  @ApiBody({ type: DeleteAlertDto })
  @ApiOperation({ description: 'Delete an alert' })
  @ApiResponses({
    okResponse: 'Alert deleted successfully',
    badRequestResponse: 'Invalid input data',
    unauthorizedResponse: 'User is not authenticated',
    internalServerErrorResponse: 'An internal server error occurred',
  })
  @ApiBearerAuth()
  async delete(@Body() dto: DeleteAlertDto) {
    return this.alertService.delete(dto);
  }

  @HttpCode(200)
  @Post('get-one')
  @ApiBody({ type: GetOneAlertRequestDto })
  @ApiOperation({ description: 'Get one alert by ID' })
  @ApiResponse({
    status: 200,
    description: 'Retrieved alert successfully',
    type: GetOneAlertResponseDto,
  })
  @ApiBearerAuth()
  async getOne(@Body() dto: GetOneAlertRequestDto) {
    return this.alertService.getOne(dto);
  }

  @HttpCode(200)
  @Post('get-all')
  @ApiBody({ type: GetAllAlertRequestDto })
  @ApiOperation({ description: 'Get all alerts (with pagination)' })
  @ApiResponse({
    status: 200,
    description: 'Retrieved all alerts successfully',
    type: GetAllAlertResponseDto,
  })
  @ApiBearerAuth()
  async getAll(@Body() dto: GetAllAlertRequestDto) {
    return this.alertService.getAll(dto);
  }
}

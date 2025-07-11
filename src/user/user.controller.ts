import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { ApiResponses } from 'src/common/decorator/api/api-responses.decorator';
import {
  getAllUserRequestDto,
  getAllUserResponseDto,
  getUserByEmailDto,
} from './dto/get-user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @HttpCode(200)
  @Post('create')
  @ApiBody({
    type: CreateUserDto,
    description: 'Data required to create a new user',
  })
  @ApiOperation({ description: 'Create a user' })
  @ApiResponses({
    okResponse: 'User created successfully',
    badRequestResponse: 'Invalid input data',
    unauthorizedResponse: 'User is not authenticated',
    internalServerErrorResponse: 'An internal server error occurred',
  })
  async create(@Body() data: CreateUserDto) {
    return this.userService.create(data);
  }

  @HttpCode(200)
  @Post('update')
  @ApiBody({
    type: CreateUserDto,
    description: 'Data required to update an existing user',
  })
  @ApiOperation({ description: 'Update a user' })
  @ApiResponses({
    okResponse: 'User updated successfully',
    badRequestResponse: 'Invalid input data',
    unauthorizedResponse: 'User is not authenticated',
    internalServerErrorResponse: 'An internal server error occurred',
  })
  async update(@Body() data: CreateUserDto) {
    return this.userService.update(data);
  }

  @HttpCode(200)
  @Post('delete')
  @ApiBody({
    type: CreateUserDto,
    description: 'Data required to delete a user',
  })
  @ApiOperation({ description: 'Delete a user' })
  @ApiResponses({
    okResponse: 'User deleted successfully',
    badRequestResponse: 'Invalid input data',
    unauthorizedResponse: 'User is not authenticated',
    internalServerErrorResponse: 'An internal server error occurred',
  })
  async delete(@Body() data: CreateUserDto) {
    return this.userService.delete(data);
  }

  @HttpCode(200)
  @Post('get-one')
  @ApiBody({
    type: CreateUserDto,
    description: 'Data required to retrieve a specific user',
  })
  @ApiOperation({ description: 'Get one user' })
  @ApiResponses({
    okResponse: 'User retrieved successfully',
    badRequestResponse: 'Invalid input data',
    unauthorizedResponse: 'User is not authenticated',
    internalServerErrorResponse: 'An internal server error occurred',
  })
  async getById(@Body() data: CreateUserDto) {
    return this.userService.getById(data);
  }

  @HttpCode(200)
  @Post('get-all')
  @ApiBody({
    type: getAllUserRequestDto,
    description: 'Data required to retrieve all users',
  })
  @ApiOperation({ description: 'Get all users' })
  @ApiResponses({
    okResponse: 'All users retrieved successfully',
    badRequestResponse: 'Invalid input data',
    unauthorizedResponse: 'User is not authenticated',
    internalServerErrorResponse: 'An internal server error occurred',
  })
  async getAll(
    @Body() data: getAllUserRequestDto,
  ): Promise<getAllUserResponseDto> {
    return this.userService.getAll(data);
  }

  @HttpCode(200)
  @Post('get-by-email')
  @ApiBody({
    type: getUserByEmailDto,
    description: 'Data required to retrieve a user by email',
  })
  @ApiOperation({ description: 'Get user by email' })
  @ApiResponses({
    okResponse: 'User retrieved successfully by email',
    badRequestResponse: 'Invalid input data',
    unauthorizedResponse: 'User is not authenticated',
    internalServerErrorResponse: 'An internal server error occurred',
  })
  async getByEmail(@Body() data: getUserByEmailDto) {
    return this.userService.getByEmail(data);
  }
}

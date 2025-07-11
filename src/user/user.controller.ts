import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiBearerAuth, ApiBody, ApiOperation } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { ApiResponses } from 'src/common/decorator/api/api-responses.decorator';
import {
  getAllUserRequestDto,
  getAllUserResponseDto,
  getOneUserDto,
  getUserByEmailDto,
} from './dto/get-user.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { DeleteUserDto } from './dto/delete-user.dto';
import { LoginDto } from './dto/login.dto';

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
    type: UpdateUserDto,
    description: 'Data required to update an existing user',
  })
  @ApiOperation({ description: 'Update a user' })
  @ApiResponses({
    okResponse: 'User updated successfully',
    badRequestResponse: 'Invalid input data',
    unauthorizedResponse: 'User is not authenticated',
    internalServerErrorResponse: 'An internal server error occurred',
  })
  async update(@Body() data: UpdateUserDto) {
    return this.userService.update(data);
  }

  @HttpCode(200)
  @Post('delete')
  @ApiBody({
    type: DeleteUserDto,
    description: 'Data required to delete a user',
  })
  @ApiOperation({ description: 'Delete a user' })
  @ApiResponses({
    okResponse: 'User deleted successfully',
    badRequestResponse: 'Invalid input data',
    unauthorizedResponse: 'User is not authenticated',
    internalServerErrorResponse: 'An internal server error occurred',
  })
  async delete(@Body() data: DeleteUserDto) {
    return this.userService.delete(data);
  }

  @HttpCode(200)
  @Post('get-one')
  @ApiBody({
    type: getOneUserDto,
    description: 'Data required to retrieve a specific user',
  })
  @ApiOperation({ description: 'Get one user' })
  @ApiResponses({
    okResponse: 'User retrieved successfully',
    badRequestResponse: 'Invalid input data',
    unauthorizedResponse: 'User is not authenticated',
    internalServerErrorResponse: 'An internal server error occurred',
  })
  async getById(@Body() data: getOneUserDto) {
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  async getByEmail(@Body() data: getUserByEmailDto) {
    return this.userService.getByEmail(data);
  }

  @HttpCode(200)
  @Post('login')
  @ApiBody({
    type: LoginDto,
    description: 'User login credentials',
  })
  @ApiOperation({ description: 'Login and get JWT token' })
  @ApiResponses({
    okResponse: 'Login successful, JWT token returned',
    badRequestResponse: 'Invalid credentials',
    internalServerErrorResponse: 'An internal server error occurred',
  })
  async login(@Body() data: LoginDto) {
    return this.userService.login(data);
  }
}

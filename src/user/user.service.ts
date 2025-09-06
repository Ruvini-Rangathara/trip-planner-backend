import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';
import { DeleteUserDto } from './dto/delete-user.dto';
import {
  getAllUserRequestDto,
  getAllUserResponseDto,
  getOneUserDto,
  getUserByEmailDto,
} from './dto/get-user.dto';
import PrismaUtil from 'src/common/util/PrismaUtil';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { ExceptionFactory } from 'src/common/exception/exception.factory';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async create(data: CreateUserDto): Promise<UserDto> {
    this.logger.log('Creating a new user');
    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existingUser) {
        this.logger.error('User already exists');
        throw ExceptionFactory.user('USER_ALREADY_EXISTS');
      }

      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(data.password, saltRounds);

      const user = await this.prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: hashedPassword,
        },
      });
      this.logger.log('User created successfully');
      return new UserDto(user);
    } catch (error) {
      this.logger.error('Error creating user', error);
      throw ExceptionFactory.user('USER_CREATION_FAILED', error);
    }
  }

  async update(data: UpdateUserDto): Promise<UserDto> {
    this.logger.log(`Updating user with ID: ${data.id}`);
    try {
      // Check if user exists
      const existingUser = await this.prisma.user.findUnique({
        where: { id: data.id },
      });
      if (!existingUser) {
        this.logger.error('User not found');
        throw ExceptionFactory.user('USER_NOT_FOUND');
      }

      const user = await this.prisma.user.update({
        where: { id: data.id },
        data: {
          name: data.name,
          email: data.email,
          travelType: data.travelType,
          climatePreference: data.climatePreference,
        },
      });
      this.logger.log('User updated successfully');
      return new UserDto(user);
    } catch (error) {
      this.logger.error('Error updating user', error);
      throw ExceptionFactory.user('USER_UPDATE_FAILED', error);
    }
  }

  async delete(data: DeleteUserDto): Promise<void> {
    this.logger.log(`Deleting user with ID: ${data.id}`);
    try {
      // Check if user exists
      const existingUser = await this.prisma.user.findUnique({
        where: { id: data.id },
      });
      if (!existingUser) {
        this.logger.error('User not found');
        throw ExceptionFactory.user('USER_NOT_FOUND');
      }

      await this.prisma.user.update({
        where: { id: data.id },
        data: { deletedAt: new Date() },
      });
      this.logger.log('User deleted successfully');
    } catch (error) {
      this.logger.error('Error deleting user', error);
      throw ExceptionFactory.user('USER_DELETION_FAILED', error);
    }
  }

  async getById(data: getOneUserDto): Promise<UserDto> {
    this.logger.log(`Finding user by ID: ${data.id}`);
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: data.id },
      });
      if (!user) {
        this.logger.error('User not found');
        throw ExceptionFactory.user('USER_NOT_FOUND');
      }
      return new UserDto(user);
    } catch (error) {
      this.logger.error('Error finding user by ID', error);
      throw ExceptionFactory.user('USER_NOT_FOUND', error);
    }
  }

  async getByEmail(data: getUserByEmailDto): Promise<UserDto | null> {
    this.logger.log(`Finding user by email: ${data.email}`);
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: data.email },
      });
      if (!user) {
        throw ExceptionFactory.user('USER_NOT_FOUND');
      }
      return new UserDto(user);
    } catch (error) {
      this.logger.error('Error finding user by email', error);
      throw ExceptionFactory.user('USER_NOT_FOUND', error);
    }
  }

  async getAll(data: getAllUserRequestDto): Promise<getAllUserResponseDto> {
    this.logger.log('Retrieving all users');
    const where = data.isDeleted ? {} : { deletedAt: null };
    const pagination = PrismaUtil.paginate(data);

    try {
      const users = await this.prisma.user.findMany({
        ...pagination,
        where,
        orderBy: { createdAt: 'desc' },
      });

      const count = await this.prisma.user.count({
        where,
      });

      this.logger.log('All users retrieved successfully');
      return new getAllUserResponseDto(
        count,
        users.map((user) => new UserDto(user)),
      );
    } catch (error) {
      this.logger.error('Error retrieving all users', error);
      throw ExceptionFactory.user('USER_NOT_FOUND', error);
    }
  }

  async login(data: LoginDto): Promise<{ access_token: string }> {
    const user = await this.getByEmail({ email: data.email });
    if (!user) {
      throw ExceptionFactory.user('USER_NOT_FOUND');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);

    if (!isPasswordValid) {
      throw ExceptionFactory.user('PASSWORD_MISMATCH');
    }

    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);
    return { access_token };
  }
}

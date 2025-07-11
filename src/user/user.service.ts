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

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private prisma: PrismaService) {}

  async create(data: CreateUserDto): Promise<UserDto> {
    this.logger.log('Creating a new user');
    try {
      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(data.password, saltRounds);

      const user = await this.prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: hashedPassword,
          travelType: data?.travelType,
          climatePreference: data?.climatePreference,
        },
      });
      this.logger.log('User created successfully');
      return new UserDto(user);
    } catch (error) {
      this.logger.error('Error creating user', error);
      throw error;
    }
  }

  async update(data: UpdateUserDto): Promise<UserDto> {
    this.logger.log(`Updating user with ID: ${data.id}`);
    try {
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
      throw error;
    }
  }

  async delete(data: DeleteUserDto): Promise<void> {
    this.logger.log(`Deleting user with ID: ${data.id}`);
    try {
      await this.prisma.user.update({
        where: { id: data.id },
        data: { deletedAt: new Date() },
      });
      this.logger.log('User deleted successfully');
    } catch (error) {
      this.logger.error('Error deleting user', error);
      throw error;
    }
  }

  async getById(data: getOneUserDto): Promise<UserDto | null> {
    this.logger.log(`Finding user by ID: ${data.id}`);
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: data.id },
      });
      return user ? new UserDto(user) : null;
    } catch (error) {
      this.logger.error('Error finding user by ID', error);
      throw error;
    }
  }

  async getByEmail(data: getUserByEmailDto): Promise<UserDto | null> {
    this.logger.log(`Finding user by email: ${data.email}`);
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: data.email },
      });
      return user ? new UserDto(user) : null;
    } catch (error) {
      this.logger.error('Error finding user by email', error);
      throw error;
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
      throw error;
    }
  }
}

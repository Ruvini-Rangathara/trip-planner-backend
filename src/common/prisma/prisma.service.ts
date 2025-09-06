import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
  PrismaClientRustPanicError,
  PrismaClientUnknownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';
import { PrismaError } from '../types/prisma-error';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);
  async onModuleInit() {
    await this.$connect();
  }

  isPrismaError(error: unknown): error is PrismaError {
    return (
      error instanceof PrismaClientKnownRequestError ||
      error instanceof PrismaClientUnknownRequestError ||
      error instanceof PrismaClientRustPanicError ||
      error instanceof PrismaClientInitializationError ||
      error instanceof PrismaClientValidationError
    );
  }

  handlePrismaError(error: unknown): never {
    if (!this.isPrismaError(error)) {
      throw new InternalServerErrorException('An unexpected error occurred');
    }

    if (error instanceof PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          throw new ConflictException(
            // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
            'Unique constraint failed on the field: ' + error.meta?.target,
          );
        case 'P2014':
          throw new ConflictException(
            'The change you are trying to make would violate the required relation between the models',
          );
        case 'P2003':
          throw new BadRequestException(
            'Foreign key constraint failed on the field: ' +
              // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
              error.meta?.field_name,
          );
        case 'P2025':
          throw new NotFoundException('Record to update not found.');
        case 'P2001':
          throw new NotFoundException(
            'The record searched for in the where condition does not exist',
          );
        case 'P2015':
          throw new NotFoundException('A related record could not be found');
        case 'P2021':
          throw new InternalServerErrorException(
            'The table does not exist in the current database',
          );
        case 'P2022':
          throw new InternalServerErrorException(
            'The column does not exist in the current database',
          );
        default:
          throw new InternalServerErrorException(
            `An unexpected database error occurred: ${error.code}`,
          );
      }
    } else if (error instanceof PrismaClientUnknownRequestError) {
      throw new InternalServerErrorException(
        'An unknown database error occurred',
      );
    } else if (error instanceof PrismaClientRustPanicError) {
      this.logger.error('Prisma Client encountered a panic error:', error);
      throw new InternalServerErrorException(
        'A critical database error occurred',
      );
    } else if (error instanceof PrismaClientInitializationError) {
      this.logger.error('Prisma Client failed to initialize:', error);
      throw new InternalServerErrorException(
        'Failed to connect to the database',
      );
    } else {
      // This must be a PrismaClientValidationError
      throw new BadRequestException(
        'The provided data is invalid: ' + error.message,
      );
    }
  }
}

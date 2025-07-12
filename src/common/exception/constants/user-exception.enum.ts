import { HttpStatus } from '@nestjs/common';

export const UserException = {
  USER_NOT_FOUND: {
    code: 63301,
    status: HttpStatus.NOT_FOUND,
    message: 'User not found',
  },
  PASSWORD_MISMATCH: {
    code: 63302,
    status: HttpStatus.UNAUTHORIZED,
    message: 'Password mismatch',
  },
  USER_ALREADY_EXISTS: {
    code: 63303,
    status: HttpStatus.BAD_REQUEST,
    message: 'User already exists',
  },
  INVALID_USER_DATA: {
    code: 63304,
    status: HttpStatus.BAD_REQUEST,
    message: 'Invalid user data',
  },
  USER_DELETION_FAILED: {
    code: 63305,
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'User deletion failed',
  },
  USER_UPDATE_FAILED: {
    code: 63306,
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'User update failed',
  },
  USER_CREATION_FAILED: {
    code: 63307,
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'User creation failed',
  },
  USER_EMAIL_NOT_VERIFIED: {
    code: 63308,
    status: HttpStatus.FORBIDDEN,
    message: 'User email not verified',
  },
  USER_NOT_AUTHENTICATED: {
    code: 63309,
    status: HttpStatus.UNAUTHORIZED,
    message: 'User is not authenticated',
  },
} as const;

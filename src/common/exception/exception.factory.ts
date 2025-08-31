import { HttpException, HttpStatus } from '@nestjs/common';
import { UserException } from './constants/user-exception.enum';
import { AreaException } from './constants/area-exception.enum';
import { AlertException } from './constants/alert-exception.enum';
import { TripException } from './constants/trip-exception.enum';

export type ErrorFormat = {
  code: number;
  status: HttpStatus;
  message: string;
  message_si?: string;
};

export class ExceptionFactory extends HttpException {
  public readonly code: number;
  private constructor(
    public readonly error: ErrorFormat,
    cause?: any,
  ) {
    super(
      {
        code: error.code,
        message: error.message,
      },
      error.status,
      { cause },
    );
    this.code = error.code;
  }
  static user(errorCode: keyof typeof UserException, cause?: any) {
    return new ExceptionFactory(UserException[errorCode], cause);
  }
  static area(errorCode: keyof typeof AreaException, cause?: any) {
    return new ExceptionFactory(AreaException[errorCode], cause);
  }
  static alert(errorCode: keyof typeof AlertException, cause?: any) {
    return new ExceptionFactory(AlertException[errorCode], cause);
  }
  static trip(errorCode: keyof typeof TripException, cause?: any) {
    return new ExceptionFactory(TripException[errorCode], cause);
  }
}

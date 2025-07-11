import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiResponseOptions,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

interface Props {
  okResponse?: object | string | ApiResponseOptions;
  badRequestResponse?: string | boolean;
  conflictResponse?: string | boolean;
  forbiddenResponse?: string | boolean;
  internalServerErrorResponse?: string | boolean;
  notFoundResponse?: string | boolean;
  unauthorizedResponse?: string | boolean;
}

export const ApiResponses = ({
  badRequestResponse,
  conflictResponse,
  forbiddenResponse,
  internalServerErrorResponse,
  notFoundResponse,
  okResponse,
  unauthorizedResponse,
}: Props) => {
  const list: any[] = [];

  if (okResponse)
    list.push(
      ApiOkResponse(
        typeof okResponse === 'object'
          ? okResponse
          : {
              type: typeof okResponse === 'function' ? okResponse : undefined,
              description: typeof okResponse === 'string' ? okResponse : 'OK',
            },
      ),
    );

  if (badRequestResponse) {
    const description =
      typeof badRequestResponse === 'boolean'
        ? 'Bad Request'
        : badRequestResponse;
    list.push(ApiBadRequestResponse({ description }));
  }

  if (conflictResponse) {
    const description =
      typeof conflictResponse === 'boolean' ? 'Conflict' : conflictResponse;
    list.push(ApiConflictResponse({ description }));
  }

  if (forbiddenResponse) {
    const description =
      typeof forbiddenResponse === 'boolean' ? 'Forbidden' : forbiddenResponse;
    list.push(ApiForbiddenResponse({ description }));
  }

  if (internalServerErrorResponse) {
    const description =
      typeof internalServerErrorResponse === 'boolean'
        ? 'Internal Server Error'
        : internalServerErrorResponse;
    list.push(ApiInternalServerErrorResponse({ description }));
  }

  if (notFoundResponse) {
    const description =
      typeof notFoundResponse === 'boolean' ? 'Not Found' : notFoundResponse;
    list.push(ApiNotFoundResponse({ description }));
  }

  if (unauthorizedResponse) {
    const description =
      typeof unauthorizedResponse === 'boolean'
        ? 'Unauthorized'
        : unauthorizedResponse;
    list.push(ApiUnauthorizedResponse({ description }));
  }

  return applyDecorators(...list);
};

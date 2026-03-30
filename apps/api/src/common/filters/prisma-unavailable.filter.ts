import { ArgumentsHost, Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';

function isDatabaseUnavailableError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    ['P1001', 'P1002', 'P1008', 'P1017', 'P2024'].includes(error.code)
  ) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Can't reach database server") ||
    message.includes('Prisma connect timeout') ||
    message.includes('Connection pool timeout') ||
    message.includes('Server has closed the connection')
  );
}

type StandardErrorResponse = {
  status: HttpStatus;
  message: string | string[];
  error: string;
  code?: string;
};

function formatUniqueTarget(metaTarget: unknown): string | null {
  if (Array.isArray(metaTarget)) {
    const fields = metaTarget.map((entry) => String(entry).trim()).filter(Boolean);
    return fields.length > 0 ? fields.join(', ') : null;
  }

  if (typeof metaTarget === 'string' && metaTarget.trim()) {
    return metaTarget.trim();
  }

  return null;
}

function mapKnownRequestError(error: Prisma.PrismaClientKnownRequestError): StandardErrorResponse {
  switch (error.code) {
    case 'P2000':
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'One of the provided values is too long.',
        error: 'Bad Request',
        code: error.code,
      };
    case 'P2001':
    case 'P2025':
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'The requested record was not found.',
        error: 'Not Found',
        code: error.code,
      };
    case 'P2002': {
      const target = formatUniqueTarget(error.meta?.target);
      return {
        status: HttpStatus.CONFLICT,
        message: target
          ? `A record with the same ${target} already exists.`
          : 'A record with the same unique value already exists.',
        error: 'Conflict',
        code: error.code,
      };
    }
    case 'P2003': {
      const fieldName =
        typeof error.meta?.field_name === 'string' && error.meta.field_name.trim()
          ? error.meta.field_name.trim()
          : null;
      return {
        status: HttpStatus.BAD_REQUEST,
        message: fieldName
          ? `Invalid relationship for field "${fieldName}".`
          : 'The request contains an invalid relationship reference.',
        error: 'Bad Request',
        code: error.code,
      };
    }
    case 'P2011':
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'A required value is missing.',
        error: 'Bad Request',
        code: error.code,
      };
    case 'P2014':
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'The requested change would violate a required relationship.',
        error: 'Bad Request',
        code: error.code,
      };
    case 'P2021':
    case 'P2022':
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Database schema is out of date. Please apply pending migrations.',
        error: 'Service Unavailable',
        code: error.code,
      };
    case 'P2010': {
      const rawCode =
        typeof error.meta?.code === 'string' || typeof error.meta?.code === 'number'
          ? String(error.meta.code)
          : '';
      const rawMessage = typeof error.meta?.message === 'string' ? error.meta.message : '';
      const combined = `${error.message} ${rawMessage}`;
      const schemaMismatch =
        ['1146', '1054', '42P01', '42703'].includes(rawCode) ||
        /(doesn't exist|does not exist|unknown table|unknown column|no such table|relation .+ does not exist)/i.test(
          combined,
        );

      if (schemaMismatch) {
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Database schema is out of date. Please apply pending migrations.',
          error: 'Service Unavailable',
          code: error.code,
        };
      }

      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Unexpected database error.',
        error: 'Internal Server Error',
        code: error.code,
      };
    }
    default:
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Unexpected database error.',
        error: 'Internal Server Error',
        code: error.code,
      };
  }
}

function mapPrismaError(error: unknown): StandardErrorResponse | null {
  if (isDatabaseUnavailableError(error)) {
    return {
      status: HttpStatus.SERVICE_UNAVAILABLE,
      message: 'Database is currently unavailable.',
      error: 'Service Unavailable',
      code: 'DATABASE_UNAVAILABLE',
    };
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      status: HttpStatus.BAD_REQUEST,
      message: 'Invalid request payload for database operation.',
      error: 'Bad Request',
      code: 'PRISMA_VALIDATION_ERROR',
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return mapKnownRequestError(error);
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Unexpected database error.',
      error: 'Internal Server Error',
      code: 'PRISMA_UNKNOWN_ERROR',
    };
  }

  return null;
}

function getHttpErrorLabel(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'Bad Request';
    case HttpStatus.UNAUTHORIZED:
      return 'Unauthorized';
    case HttpStatus.FORBIDDEN:
      return 'Forbidden';
    case HttpStatus.NOT_FOUND:
      return 'Not Found';
    case HttpStatus.CONFLICT:
      return 'Conflict';
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return 'Unprocessable Entity';
    case HttpStatus.SERVICE_UNAVAILABLE:
      return 'Service Unavailable';
    default:
      return status >= 500 ? 'Internal Server Error' : 'Error';
  }
}

function mapHttpException(exception: HttpException): StandardErrorResponse {
  const status = exception.getStatus() as HttpStatus;
  const fallbackError = getHttpErrorLabel(status);
  const payload = exception.getResponse();

  if (typeof payload === 'string') {
    return {
      status,
      message: payload,
      error: fallbackError,
      code: status === HttpStatus.BAD_REQUEST ? 'VALIDATION_ERROR' : undefined,
    };
  }

  if (payload && typeof payload === 'object') {
    const responsePayload = payload as {
      message?: string | string[];
      error?: string;
      code?: string;
    };

    const message =
      typeof responsePayload.message === 'string' || Array.isArray(responsePayload.message)
        ? responsePayload.message
        : exception.message;

    return {
      status,
      message,
      error: responsePayload.error ?? fallbackError,
      code:
        typeof responsePayload.code === 'string'
          ? responsePayload.code
          : status === HttpStatus.BAD_REQUEST
            ? 'VALIDATION_ERROR'
            : undefined,
    };
  }

  return {
    status,
    message: exception.message,
    error: fallbackError,
    code: status === HttpStatus.BAD_REQUEST ? 'VALIDATION_ERROR' : undefined,
  };
}

@Catch()
export class PrismaUnavailableFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(PrismaUnavailableFilter.name);

  constructor(httpAdapterHost: HttpAdapterHost) {
    super(httpAdapterHost.httpAdapter);
  }

  override catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();
    const requestId = request.id ?? (request.headers['x-request-id'] as string | undefined);

    const mappedPrismaError = mapPrismaError(exception);
    const mappedHttpError =
      mappedPrismaError ??
      (exception instanceof HttpException ? mapHttpException(exception) : null);

    const payload: StandardErrorResponse =
      mappedHttpError ?? {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'An unexpected internal error occurred.',
        error: 'Internal Server Error',
        code: 'INTERNAL_SERVER_ERROR',
      };

    const location = `${request.method} ${request.url}`;
    if (payload.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${requestId ?? 'n/a'}] ${location} -> ${payload.status}${
          payload.code ? ` (${payload.code})` : ''
        }`,
      );
    } else {
      this.logger.warn(
        `[${requestId ?? 'n/a'}] ${location} -> ${payload.status}${
          payload.code ? ` (${payload.code})` : ''
        }`,
      );
    }

    response.locals.dashboardErrorCode = payload.code ?? null;

    response.status(payload.status).json({
      statusCode: payload.status,
      message: payload.message,
      error: payload.error,
      ...(payload.code ? { code: payload.code } : {}),
      ...(requestId ? { requestId } : {}),
    });
  }
}

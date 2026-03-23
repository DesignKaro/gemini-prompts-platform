import { ArgumentsHost, Catch, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { BaseExceptionFilter } from '@nestjs/core';

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

@Catch()
export class PrismaUnavailableFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(PrismaUnavailableFilter.name);

  override catch(exception: unknown, host: ArgumentsHost) {
    if (!isDatabaseUnavailableError(exception)) {
      return super.catch(exception, host);
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = HttpStatus.SERVICE_UNAVAILABLE;

    this.logger.warn(`Database unavailable for ${request.method} ${request.url}. Returning 503.`);
    response.status(status).json({
      statusCode: status,
      message: 'Database is currently unavailable.',
      error: 'Service Unavailable',
    });
  }
}

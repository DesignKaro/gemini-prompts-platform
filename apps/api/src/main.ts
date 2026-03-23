import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { randomUUID } from 'crypto';

async function bootstrap() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[bootstrap] Starting Nest application...');
  }
  const app = await NestFactory.create(AppModule);
  if (process.env.NODE_ENV !== 'production') {
    console.log('[bootstrap] Nest application created.');
  }
  const configService = app.get(ConfigService);
  const frontendUrl = configService.get<string>('FRONTEND_URL') ?? 'http://localhost:30001';
  const allowedOrigins = [
    frontendUrl,
    'http://localhost:30001',
    'http://127.0.0.1:30001',
    // legacy local dev port
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://geminiprompts.io',
    'https://www.geminiprompts.io',
  ];

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (curl, server-to-server, mobile apps).
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.error('Blocked CORS origin:', origin);
      // Do not throw here; returning false keeps preflight stable.
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId =
      (req.headers['x-request-id'] as string) || randomUUID();
    const start = Date.now();
    res.setHeader('x-request-id', requestId);
    (req as Request & { id: string }).id = requestId;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const method = req.method;
      const url = (req as { originalUrl?: string }).originalUrl || req.url;
      const status = res.statusCode;
      console.log(`[${requestId}] ${method} ${url} ${status} ${duration}ms`);
    });

    next();
  });
  app.use(json({ limit: '12mb' }));
  app.use(urlencoded({ extended: true, limit: '12mb' }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Gemini Prompts CMS API')
    .setDescription('The powerful backend API for the Gemini Prompts CMS.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('PORT') ?? 4000;
  const host = configService.get<string>('HOST') ?? '127.0.0.1';
  await app.listen(port, host);
  const logHost = host === '0.0.0.0' ? '127.0.0.1' : host;
  console.log(`API running on http://${logHost}:${port}/api`);
}

bootstrap();

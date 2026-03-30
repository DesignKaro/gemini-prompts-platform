import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { json, urlencoded } from 'express';
import compression from 'compression';
import { AppModule } from './app.module';
import { randomUUID } from 'crypto';
import { PrismaUnavailableFilter } from './common/filters/prisma-unavailable.filter';
import { HttpAdapterHost } from '@nestjs/core';

type RequestWithContext = Request & {
  id?: string;
  user?: {
    sub?: string;
    id?: string;
  };
};

function isDashboardRoute(url: string) {
  const path = url.split('?')[0] ?? '';
  return path.startsWith('/api/admin') || path.startsWith('/api/auth/profile');
}

function inferDashboardAction(method: string, url: string) {
  const path = (url.split('?')[0] ?? '').replace(/\/+$/, '');

  if (path === '/api/auth/profile/summary') {
    return 'profile.summary.read';
  }

  if (path === '/api/auth/profile') {
    return method === 'PATCH' ? 'profile.update' : 'profile.read';
  }

  if (!path.startsWith('/api/admin')) {
    return 'dashboard.unknown';
  }

  const segments = path
    .replace(/^\/api\/admin\/?/, '')
    .split('/')
    .filter(Boolean);
  const resource = segments[0] ?? 'unknown';
  const detail = segments[1] ?? null;

  if (method === 'GET') {
    return detail ? `${resource}.read` : `${resource}.list`;
  }

  if (method === 'POST') {
    if (detail === 'reply') {
      return `${resource}.reply`;
    }
    return `${resource}.create`;
  }

  if (method === 'PATCH') {
    if (detail === 'restore') return `${resource}.restore`;
    if (detail === 'status') return `${resource}.status`;
    if (detail === 'suspend') return `${resource}.suspend`;
    if (detail === 'activate') return `${resource}.activate`;
    if (detail === 'roles') return `${resource}.roles.update`;
    return `${resource}.update`;
  }

  if (method === 'DELETE') {
    return `${resource}.delete`;
  }

  return `${resource}.${method.toLowerCase()}`;
}

function getClientDashboardAction(req: Request): string | null {
  const rawHeader = req.headers['x-dashboard-action'];
  const value = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, 120);
}

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
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-dashboard-action'],
    exposedHeaders: ['x-request-id'],
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
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new PrismaUnavailableFilter(httpAdapterHost));

  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    const start = Date.now();
    const slowRequestThresholdMs = Number(process.env.SLOW_REQUEST_THRESHOLD_MS ?? 800);
    res.setHeader('x-request-id', requestId);
    (req as RequestWithContext).id = requestId;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const method = req.method;
      const url = (req as { originalUrl?: string }).originalUrl || req.url;
      const status = res.statusCode;
      const mappedErrorCode = (res.locals as { dashboardErrorCode?: string | null })
        .dashboardErrorCode;

      if (isDashboardRoute(url)) {
        const actorId = (req as RequestWithContext).user?.sub ?? (req as RequestWithContext).user?.id;
        const inferredAction = inferDashboardAction(method, url);
        const clientAction = getClientDashboardAction(req);
        const action = clientAction ?? inferredAction;
        const logPayload = {
          type: 'dashboard_action',
          requestId,
          actorId: actorId ?? null,
          route: url,
          action,
          clientAction: clientAction ?? null,
          inferredAction,
          status,
          code: mappedErrorCode ?? null,
          durationMs: duration,
        };
        const serialized = JSON.stringify(logPayload);
        if (status >= 500) {
          console.error(serialized);
        } else if (status >= 400) {
          console.warn(serialized);
        } else {
          console.log(serialized);
        }
        return;
      }

      const message = `[${requestId}] ${method} ${url} ${status} ${duration}ms`;

      if (duration >= slowRequestThresholdMs) {
        console.warn(`[SLOW_REQUEST] ${message}`);
        return;
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log(message);
      }
    });

    next();
  });
  app.use(json({ limit: '12mb' }));
  app.use(urlencoded({ extended: true, limit: '12mb' }));
  app.use(
    compression({
      threshold: 1024,
    }),
  );

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

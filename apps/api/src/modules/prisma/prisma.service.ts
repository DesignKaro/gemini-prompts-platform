import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function resolvePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildDatasourceUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return rawUrl;

  try {
    const url = new URL(rawUrl);

    if (!url.searchParams.has('pool_timeout')) {
      // Prisma pool timeout is in seconds; use a safer default to reduce transient P2024s.
      const poolTimeoutSeconds = resolvePositiveInt(process.env.PRISMA_POOL_TIMEOUT, 30);
      url.searchParams.set('pool_timeout', String(poolTimeoutSeconds));
    }

    const connectionLimit = resolvePositiveInt(process.env.PRISMA_CONNECTION_LIMIT, 0);
    if (connectionLimit > 0 && !url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', String(connectionLimit));
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const datasourceUrl = buildDatasourceUrl(process.env.DATABASE_URL);
    super(
      datasourceUrl
        ? {
            datasources: {
              db: {
                url: datasourceUrl,
              },
            },
          }
        : undefined,
    );
  }

  async onModuleInit(): Promise<void> {
    const blockOnConnect =
      process.env.NODE_ENV === 'production' || process.env.PRISMA_BLOCK_ON_CONNECT === 'true';

    if (blockOnConnect) {
      await this.connectWithRetry();
      return;
    }

    this.logger.warn(
      'Starting API without blocking on initial DB connection (development/degraded mode).',
    );
    void this.connectWithRetry();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  private async connectWithRetry(): Promise<void> {
    const maxAttempts = resolvePositiveInt(process.env.PRISMA_CONNECT_MAX_ATTEMPTS, 8);
    const baseDelayMs = resolvePositiveInt(process.env.PRISMA_CONNECT_BASE_DELAY_MS, 500);
    const maxDelayMs = resolvePositiveInt(process.env.PRISMA_CONNECT_MAX_DELAY_MS, 8000);
    const timeoutMs = resolvePositiveInt(process.env.PRISMA_CONNECT_TIMEOUT_MS, 10000);

    const withTimeout = async <T>(promise: Promise<T>, ms: number): Promise<T> => {
      let timer: NodeJS.Timeout | undefined;
      try {
        return await new Promise<T>((resolve, reject) => {
          timer = setTimeout(() => reject(new Error('Prisma connect timeout')), ms);
          promise.then(resolve).catch(reject);
        });
      } finally {
        if (timer) clearTimeout(timer);
      }
    };

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        this.logger.log(`Prisma connecting (attempt ${attempt}/${maxAttempts})...`);
        await withTimeout(this.$connect(), timeoutMs);
        this.logger.log('Prisma connected.');
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (attempt === maxAttempts) {
          this.logger.error(`Prisma connection failed after ${attempt} attempts: ${message}`);
          // In local/dev environments, don't hard-crash the whole app if DB is temporarily unavailable.
          // API handlers that hit the DB will still fail, but the server can at least boot.
          if (process.env.NODE_ENV === 'production') {
            throw error;
          }
          return;
        }

        const delayMs = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
        this.logger.warn(
          `Prisma connection failed (attempt ${attempt}/${maxAttempts}). Retrying in ${delayMs}ms. ${message}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
}

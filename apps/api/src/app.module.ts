import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bullmq';
import { redisStore } from 'cache-manager-redis-yet';
import { join } from 'node:path';

import { validateEnv } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AdminModule } from './modules/admin/admin.module';
import { PublicModule } from './modules/public/public.module';

const redisEnabled =
  process.env.REDIS_ENABLED === 'true' ||
  (process.env.NODE_ENV === 'production' && process.env.REDIS_ENABLED !== 'false');

const cacheModule = redisEnabled
  ? CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL', 'redis://localhost:6379');
        let host = 'localhost';
        let port = 6379;
        let username: string | undefined;
        let password: string | undefined;
        try {
          const parsed = new URL(redisUrl);
          host = parsed.hostname || host;
          port = parsed.port ? parseInt(parsed.port, 10) : port;
          username = parsed.username || undefined;
          password = parsed.password || undefined;
        } catch {
          // Fall back to default host/port if REDIS_URL is invalid.
        }

        return {
          store: await redisStore({
            socket: { host, port },
            username,
            password,
          }),
        };
      },
      inject: [ConfigService],
    })
  : CacheModule.register({ isGlobal: true });

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '..', '.env'), '.env'],
      validate: validateEnv,
    }),
    cacheModule,
    ...(redisEnabled
      ? [
          BullModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
              const redisUrl = configService.get<string>('REDIS_URL', 'redis://localhost:6379');
              let host = 'localhost';
              let port = 6379;
              let username: string | undefined;
              let password: string | undefined;
              try {
                const parsed = new URL(redisUrl);
                host = parsed.hostname || host;
                port = parsed.port ? parseInt(parsed.port, 10) : port;
                username = parsed.username || undefined;
                password = parsed.password || undefined;
              } catch {
                // Fall back to default host/port if REDIS_URL is invalid.
              }

              return {
                connection: {
                  host,
                  port,
                  username,
                  password,
                },
              };
            },
            inject: [ConfigService],
          }),
        ]
      : []),
    PrismaModule,
    HealthModule,
    AuthModule,
    AdminModule,
    PublicModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

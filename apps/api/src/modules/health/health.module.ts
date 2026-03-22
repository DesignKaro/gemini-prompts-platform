import { Module } from '@nestjs/common';
import { DatabaseReadinessService } from './database-readiness.service';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  controllers: [HealthController],
  providers: [HealthService, DatabaseReadinessService],
  exports: [HealthService],
})
export class HealthModule {}

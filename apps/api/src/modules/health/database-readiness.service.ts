import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { HealthService } from './health.service';

@Injectable()
export class DatabaseReadinessService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseReadinessService.name);

  constructor(private readonly healthService: HealthService) {}

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('Running database readiness check...');
    await this.healthService.assertDatabaseReady();
  }
}

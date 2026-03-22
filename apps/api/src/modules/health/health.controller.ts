import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async health() {
    const database = await this.healthService.checkDatabase();
    const status = database.connected && database.missingTables.length === 0 ? 'ok' : 'degraded';

    return {
      status,
      database,
      timestamp: new Date().toISOString(),
    };
  }
}

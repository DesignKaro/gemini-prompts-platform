import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';

type HealthDatabaseResult = {
  connected: boolean;
  missingTables: string[];
  error?: string;
};

const REQUIRED_TABLES = ['User', 'AuthAccount', 'PasswordCredential', 'RefreshToken'] as const;

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkDatabase(): Promise<HealthDatabaseResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1 as ok`;

      const rows = await this.prisma.$queryRaw<Array<{ tableName: string }>>`
        SELECT table_name as tableName
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
      `;

      const existing = new Set(rows.map((row) => row.tableName.toLowerCase()));
      const missingTables = REQUIRED_TABLES.filter((table) => !existing.has(table.toLowerCase()));

      return {
        connected: true,
        missingTables,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown database error.';
      return {
        connected: false,
        missingTables: [],
        error: message,
      };
    }
  }

  async assertDatabaseReady(): Promise<void> {
    const result = await this.checkDatabase();
    if (!result.connected) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Database connection failed: ${result.error ?? 'Unknown error.'}`);
      }
      this.logger.warn(
        `Database connection failed (${result.error ?? 'Unknown error.'}). Continuing in degraded mode (NODE_ENV=${process.env.NODE_ENV}).`,
      );
      return;
    }

    if (result.missingTables.length > 0) {
      const message = `Database is reachable but missing required tables: ${result.missingTables.join(
        ', ',
      )}. Apply db/migrations/0001_init.sql and db/migrations/0002_auth.sql.`;

      if (process.env.NODE_ENV === 'production') {
        throw new Error(message);
      }
      this.logger.warn(`Database is not ready: ${message} Continuing in degraded mode.`);
      return;
    }

    this.logger.log('Database readiness check passed.');
  }
}

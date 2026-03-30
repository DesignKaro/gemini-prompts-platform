import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { AuditModule } from '../../audit/audit.module';
import { PromptsController } from './prompts.controller';
import { PromptsService } from './prompts.service';
import { MediaStorageModule } from '../../media-storage/media-storage.module';

@Module({
  imports: [AuthModule, AuditModule, MediaStorageModule],
  controllers: [PromptsController],
  providers: [PromptsService],
})
export class PromptsModule {}

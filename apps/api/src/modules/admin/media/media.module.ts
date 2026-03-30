import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { AuditModule } from '../../audit/audit.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaStorageModule } from '../../media-storage/media-storage.module';

@Module({
  imports: [AuthModule, AuditModule, MediaStorageModule],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}

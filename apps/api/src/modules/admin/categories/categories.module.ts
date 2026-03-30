import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { AuditModule } from '../../audit/audit.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { MediaStorageModule } from '../../media-storage/media-storage.module';

@Module({
  imports: [AuthModule, AuditModule, MediaStorageModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}

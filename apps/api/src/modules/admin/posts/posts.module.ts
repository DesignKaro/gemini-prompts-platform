import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { AuditModule } from '../../audit/audit.module';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { MediaStorageModule } from '../../media-storage/media-storage.module';

@Module({
  imports: [AuthModule, AuditModule, MediaStorageModule],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}

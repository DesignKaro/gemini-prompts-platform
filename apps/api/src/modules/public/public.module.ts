import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SeoModule } from '../seo/seo.module';
import { PublicCacheInterceptor } from './public-cache.interceptor';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [AuthModule, SeoModule],
  controllers: [PublicController],
  providers: [PublicService, PublicCacheInterceptor],
})
export class PublicModule {}

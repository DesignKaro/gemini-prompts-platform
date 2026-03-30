import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { SeoModule as SharedSeoModule } from '../../seo/seo.module';
import { SeoController } from './seo.controller';

@Module({
  imports: [AuthModule, SharedSeoModule],
  controllers: [SeoController],
})
export class SeoModule {}

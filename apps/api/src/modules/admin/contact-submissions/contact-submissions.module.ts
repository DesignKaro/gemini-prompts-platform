import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ContactSubmissionsController } from './contact-submissions.controller';
import { ContactSubmissionsService } from './contact-submissions.service';

@Module({
  imports: [AuthModule],
  controllers: [ContactSubmissionsController],
  providers: [ContactSubmissionsService],
})
export class ContactSubmissionsModule {}

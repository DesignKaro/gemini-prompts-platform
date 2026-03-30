import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { MediaStorageModule } from '../../media-storage/media-storage.module';

@Module({
  imports: [AuthModule, MediaStorageModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}

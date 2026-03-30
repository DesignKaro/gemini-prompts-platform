import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { SearchController } from './search.controller';
import { SearchResultsController } from './search-results.controller';
import { SearchService } from './search.service';

@Module({
  imports: [AuthModule],
  controllers: [SearchController, SearchResultsController],
  providers: [SearchService],
})
export class SearchModule {}

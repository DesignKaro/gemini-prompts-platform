import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user.type';
import { SearchService } from './search.service';
import { SearchResultsQueryDto } from './dto/search-results-query.dto';

@ApiTags('Admin Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/search')
export class SearchResultsController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  getResults(@CurrentUser() user: AuthUser, @Query() query: SearchResultsQueryDto) {
    return this.searchService.getResults(user, query.search ?? '', query.take ?? 20);
  }
}

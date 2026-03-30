import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user.type';
import { SearchService } from './search.service';
import { SearchSuggestionsQueryDto } from './dto/search-suggestions-query.dto';

@ApiTags('Admin Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/search-suggestions')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  getSuggestions(@CurrentUser() user: AuthUser, @Query() query: SearchSuggestionsQueryDto) {
    return this.searchService.getSuggestions(user, query.search ?? '', query.take ?? 4);
  }
}

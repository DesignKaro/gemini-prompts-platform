import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user.type';
import { SearchService } from './search.service';

@ApiTags('Admin Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/search-suggestions')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  getSuggestions(
    @CurrentUser() user: AuthUser,
    @Query('search') search?: string,
    @Query('take') take?: string,
  ) {
    const limit = take ? parseInt(take, 10) : 4;
    return this.searchService.getSuggestions(user, search ?? '', limit);
  }
}

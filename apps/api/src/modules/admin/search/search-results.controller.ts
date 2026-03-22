import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user.type';
import { SearchService } from './search.service';

@ApiTags('Admin Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/search')
export class SearchResultsController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  getResults(
    @CurrentUser() user: AuthUser,
    @Query('search') search?: string,
    @Query('take') take?: string,
  ) {
    const limit = take ? parseInt(take, 10) : 20;
    return this.searchService.getResults(user, search ?? '', limit);
  }
}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { PromptsController } from './prompts/prompts.controller';
import { PromptsService } from './prompts/prompts.service';
import { PostsController } from './posts/posts.controller';
import { PostsService } from './posts/posts.service';
import { CategoriesController } from './categories/categories.controller';
import { CategoriesService } from './categories/categories.service';
import { TagsController } from './tags/tags.controller';
import { TagsService } from './tags/tags.service';
import { AnalyticsController } from './analytics/analytics.controller';
import { AnalyticsService } from './analytics/analytics.service';
import { CommentsController } from './comments/comments.controller';
import { CommentsService } from './comments/comments.service';
import { MediaController } from './media/media.controller';
import { MediaService } from './media/media.service';
import { ActivityController } from './activity/activity.controller';
import { ActivityService } from './activity/activity.service';
import { RolesController } from './roles/roles.controller';
import { RolesService } from './roles/roles.service';
import { SearchController } from './search/search.controller';
import { SearchResultsController } from './search/search-results.controller';
import { SearchService } from './search/search.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [
    UsersController,
    PromptsController,
    PostsController,
    CategoriesController,
    TagsController,
    AnalyticsController,
    CommentsController,
    MediaController,
    ActivityController,
    RolesController,
    SearchController,
    SearchResultsController,
  ],
  providers: [
    UsersService,
    PromptsService,
    PostsService,
    CategoriesService,
    TagsService,
    AnalyticsService,
    CommentsService,
    MediaService,
    ActivityService,
    RolesService,
    SearchService,
  ],
})
export class AdminModule {}

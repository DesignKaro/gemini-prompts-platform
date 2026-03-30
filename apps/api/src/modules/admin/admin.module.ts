import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { ActivityModule } from './activity/activity.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CategoriesModule } from './categories/categories.module';
import { CommentsModule } from './comments/comments.module';
import { ContactSubmissionsModule } from './contact-submissions/contact-submissions.module';
import { MediaModule } from './media/media.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { LogsModule } from './logs/logs.module';
import { PostsModule } from './posts/posts.module';
import { PromptsModule } from './prompts/prompts.module';
import { RolesModule } from './roles/roles.module';
import { SearchModule } from './search/search.module';
import { SeoModule } from './seo/seo.module';
import { TagsModule } from './tags/tags.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    AuthModule,
    AuditModule,
    ActivityModule,
    AnalyticsModule,
    CategoriesModule,
    CommentsModule,
    ContactSubmissionsModule,
    MediaModule,
    NewsletterModule,
    LogsModule,
    PostsModule,
    PromptsModule,
    RolesModule,
    SearchModule,
    SeoModule,
    TagsModule,
    UsersModule,
  ],
})
export class AdminModule {}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PromptVisibility } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { PublicCacheInterceptor } from './public-cache.interceptor';
import { PromptCommentCreateDto } from './dto/prompt-comment-create.dto';
import { CreateMembershipCheckoutOrderDto } from './dto/create-membership-checkout-order.dto';
import { CreateContactSubmissionDto } from './dto/create-contact-submission.dto';
import { CreateNewsletterSubmissionDto } from './dto/create-newsletter-submission.dto';
import { PromptInteractionStatusRequestDto } from './dto/prompt-interaction-status.dto';
import { ResolveRedirectQueryDto } from './dto/resolve-redirect-query.dto';
import { SeoSettingsQueryDto } from './dto/seo-settings-query.dto';
import { VerifyMembershipCheckoutDto } from './dto/verify-membership-checkout.dto';
import { PublicService } from './public.service';
import { SeoIntegrationsService } from '../seo/seo-integrations.service';
import { SeoSettingsService } from '../seo/seo-settings.service';
import { RedirectRulesService } from '../seo/redirect-rules.service';

type HeaderValue = string | string[] | undefined;

type HttpRequest = {
  headers: Record<string, HeaderValue>;
  ip?: string;
  socket?: {
    remoteAddress?: string;
  };
};

@Controller('public')
@UseInterceptors(PublicCacheInterceptor)
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly authService: AuthService,
    private readonly seoSettingsService: SeoSettingsService,
    private readonly seoIntegrationsService: SeoIntegrationsService,
    private readonly redirectRulesService: RedirectRulesService,
  ) {}

  @Get('home')
  getHome(@Req() request: HttpRequest) {
    return this.publicService.getHome(this.resolveOptionalViewer(request));
  }

  @Get('search')
  search(
    @Query('query') query?: string,
    @Query('take') take?: string,
    @Req() request?: HttpRequest,
  ) {
    return this.publicService.search(
      query ?? '',
      take ? parseInt(take, 10) : 8,
      request ? this.resolveOptionalViewer(request) : undefined,
    );
  }

  @Get('seo/settings')
  async getSeoSettings(@Query() query: SeoSettingsQueryDto) {
    const [settings, integrations] = await Promise.all([
      this.seoSettingsService.getPublicSettings(),
      this.seoIntegrationsService.getPublicSettings(query.scope),
    ]);
    return {
      ...settings,
      integrations,
    };
  }

  @Get('seo/redirects/resolve')
  resolveRedirect(@Query() query: ResolveRedirectQueryDto) {
    return this.redirectRulesService.resolve(query.path);
  }

  @Get('prompts')
  getPrompts(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
    @Query('category') categorySlug?: string,
    @Query('tag') tagSlug?: string,
    @Query('author') authorSlug?: string,
    @Query('authorId') authorId?: string,
    @Query('authorIds') authorIds?: string,
    @Query('publishedFrom') publishedFrom?: string,
    @Query('publishedTo') publishedTo?: string,
    @Query('includeTags') includeTags?: string,
    @Query('visibility') visibility?: PromptVisibility,
    @Query('sort') sort?: 'latest' | 'popular' | 'trending',
    @Req() request?: HttpRequest,
  ) {
    const includeTagsFlag = includeTags === '1' || includeTags?.toLowerCase() === 'true';
    const parsedAuthorIds = Array.from(
      new Set(
        (authorIds ?? '')
          .split(',')
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      ),
    );

    return this.publicService.getPrompts(
      {
        skip: skip ? parseInt(skip, 10) : 0,
        take: take ? parseInt(take, 10) : 20,
        search,
        categorySlug,
        tagSlug,
        authorSlug,
        authorId,
        authorIds: parsedAuthorIds.length > 0 ? parsedAuthorIds : undefined,
        publishedFrom,
        publishedTo,
        includeTags: includeTagsFlag,
        visibility,
        sort,
      },
      request ? this.resolveOptionalViewer(request) : undefined,
    );
  }

  @Get('prompts/:slug')
  getPrompt(@Param('slug') slug: string, @Req() request: HttpRequest) {
    return this.publicService.getPrompt(slug, this.resolveOptionalViewer(request));
  }

  @Post('prompts/:id/view')
  trackPromptView(@Param('id') id: string, @Req() request: HttpRequest) {
    const viewer = this.resolveOptionalViewer(request);
    return this.publicService.trackPromptView(
      id,
      this.getRequestClientAddress(request),
      this.readHeaderValue(request, 'user-agent'),
      viewer?.sub,
    );
  }

  @Post('prompts/interactions/status')
  getPromptInteractionStatus(
    @Body() body: PromptInteractionStatusRequestDto,
    @Req() request: HttpRequest,
  ) {
    const viewer = this.resolveOptionalViewer(request);
    return this.publicService.getPromptInteractionStatus(
      body.promptIds ?? [],
      this.getRequestClientAddress(request),
      viewer?.sub,
    );
  }

  @Post('prompts/:id/like')
  likePrompt(@Param('id') id: string, @Req() request: HttpRequest) {
    const viewer = this.resolveOptionalViewer(request);
    return this.publicService.likePrompt(
      id,
      this.getRequestClientAddress(request),
      this.readHeaderValue(request, 'user-agent'),
      viewer?.sub,
    );
  }

  @Post('prompts/:id/share')
  sharePrompt(@Param('id') id: string, @Req() request: HttpRequest) {
    const viewer = this.resolveOptionalViewer(request);
    return this.publicService.sharePrompt(id, viewer?.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('prompts/:id/save')
  savePrompt(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.publicService.savePrompt(id, user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('prompts/:id/save')
  unsavePrompt(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.publicService.unsavePrompt(id, user);
  }

  @Get('prompts/:id/comments')
  getPromptComments(
    @Param('id') id: string,
    @Req() request: HttpRequest,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const viewer = this.resolveOptionalViewer(request);
    return this.publicService.getPromptComments(
      id,
      {
        skip: skip ? parseInt(skip, 10) : 0,
        take: take ? parseInt(take, 10) : 20,
      },
      this.getRequestClientAddress(request),
      viewer?.sub,
      viewer,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('prompts/:id/comments')
  createPromptComment(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: PromptCommentCreateDto,
  ) {
    return this.publicService.createPromptComment(id, user, body.content, body.parentId);
  }

  @Post('comments/:id/like')
  likeComment(@Param('id') id: string, @Req() request: HttpRequest) {
    const viewer = this.resolveOptionalViewer(request);
    return this.publicService.likeComment(
      id,
      this.getRequestClientAddress(request),
      this.readHeaderValue(request, 'user-agent'),
      viewer?.sub,
      viewer,
    );
  }

  @Get('posts')
  getPosts(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
    @Query('category') categorySlug?: string,
    @Query('tag') tagSlug?: string,
    @Query('author') authorSlug?: string,
    @Query('authorId') authorId?: string,
    @Query('includeContent') includeContent?: string,
    @Query('includeTags') includeTags?: string,
    @Query('visibility') visibility?: PromptVisibility,
    @Query('sort') sort?: 'latest' | 'popular',
    @Req() request?: HttpRequest,
  ) {
    const includeContentFlag = includeContent === '1' || includeContent?.toLowerCase() === 'true';
    const includeTagsFlag = includeTags === '1' || includeTags?.toLowerCase() === 'true';

    return this.publicService.getPosts(
      {
        skip: skip ? parseInt(skip, 10) : 0,
        take: take ? parseInt(take, 10) : 20,
        search,
        categorySlug,
        tagSlug,
        authorSlug,
        authorId,
        includeContent: includeContentFlag,
        includeTags: includeTagsFlag,
        visibility,
        sort,
      },
      request ? this.resolveOptionalViewer(request) : undefined,
    );
  }

  @Get('posts/:slug')
  getPost(@Param('slug') slug: string, @Req() request: HttpRequest) {
    return this.publicService.getPost(slug, this.resolveOptionalViewer(request));
  }

  @Post('newsletter/submissions')
  createNewsletterSubmission(@Body() body: CreateNewsletterSubmissionDto) {
    return this.publicService.createNewsletterSubmission(body);
  }

  @Post('contact/submissions')
  createContactSubmission(@Body() body: CreateContactSubmissionDto, @Req() request: HttpRequest) {
    return this.publicService.createContactSubmission({
      ...body,
      ipAddress: this.getRequestClientAddress(request),
      userAgent: this.readHeaderValue(request, 'user-agent'),
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('membership/checkout/order')
  createMembershipCheckoutOrder(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateMembershipCheckoutOrderDto,
  ) {
    return this.publicService.createMembershipCheckoutOrder(user, body.cycle);
  }

  @UseGuards(JwtAuthGuard)
  @Post('membership/checkout/verify')
  verifyMembershipCheckout(@CurrentUser() user: AuthUser, @Body() body: VerifyMembershipCheckoutDto) {
    return this.publicService.verifyMembershipCheckout(user, body);
  }

  @Post('posts/:id/view')
  trackPostView(@Param('id') id: string, @Req() request: HttpRequest) {
    const viewer = this.resolveOptionalViewer(request);
    return this.publicService.trackPostView(
      id,
      this.getRequestClientAddress(request),
      this.readHeaderValue(request, 'user-agent'),
      viewer?.sub,
    );
  }

  @Get('posts/:id/comments')
  getPostComments(
    @Param('id') id: string,
    @Req() request: HttpRequest,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const viewer = this.resolveOptionalViewer(request);
    return this.publicService.getPostComments(
      id,
      {
        skip: skip ? parseInt(skip, 10) : 0,
        take: take ? parseInt(take, 10) : 20,
      },
      this.getRequestClientAddress(request),
      viewer?.sub,
      viewer,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('posts/:id/comments')
  createPostComment(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: PromptCommentCreateDto,
  ) {
    return this.publicService.createPostComment(id, user, body.content, body.parentId);
  }

  @Get('categories')
  getCategories(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('sort') sort?: 'name' | 'popular',
    @Req() request?: HttpRequest,
  ) {
    return this.publicService.getCategories(
      {
        skip: skip ? parseInt(skip, 10) : 0,
        take: take ? parseInt(take, 10) : 48,
        sort,
      },
      request ? this.resolveOptionalViewer(request) : undefined,
    );
  }

  @Get('categories/:slug')
  getCategory(@Param('slug') slug: string, @Req() request: HttpRequest) {
    return this.publicService.getCategory(slug, this.resolveOptionalViewer(request));
  }

  @Get('tags')
  getTags(
    @Query('take') take?: string,
    @Query('sort') sort?: 'name' | 'popular',
    @Req() request?: HttpRequest,
  ) {
    return this.publicService.getTags(
      {
        take: take ? parseInt(take, 10) : 100,
        sort,
      },
      request ? this.resolveOptionalViewer(request) : undefined,
    );
  }

  @Get('tags/:slug')
  getTag(@Param('slug') slug: string, @Req() request: HttpRequest) {
    return this.publicService.getTag(slug, this.resolveOptionalViewer(request));
  }

  @Get('authors')
  getAuthors(
    @Query('take') take?: string,
    @Query('sort') sort?: 'name' | 'popular',
    @Req() request?: HttpRequest,
  ) {
    return this.publicService.getAuthors(
      {
        take: take ? parseInt(take, 10) : 48,
        sort,
      },
      request ? this.resolveOptionalViewer(request) : undefined,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('authors/following')
  getFollowedAuthors(@CurrentUser() user: AuthUser) {
    return this.publicService.getFollowedAuthors(user.sub);
  }

  @Get('authors/:slug')
  getAuthor(@Param('slug') slug: string, @Req() request: HttpRequest) {
    return this.publicService.getAuthor(slug, this.resolveOptionalViewer(request));
  }

  @UseGuards(JwtAuthGuard)
  @Get('authors/:id/follow')
  getAuthorFollowStatus(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.publicService.getAuthorFollowStatus(id, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('authors/:id/follow')
  followAuthor(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.publicService.followAuthor(id, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('authors/:id/follow')
  unfollowAuthor(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.publicService.unfollowAuthor(id, user.sub);
  }

  private readHeaderValue(request: HttpRequest, headerName: string): string | undefined {
    const raw = request.headers[headerName];
    if (Array.isArray(raw)) {
      return raw[0];
    }
    return raw;
  }

  private getRequestClientAddress(request: HttpRequest): string {
    const forwardedFor = this.readHeaderValue(request, 'x-forwarded-for');
    const forwardedIp = forwardedFor?.split(',')[0]?.trim();
    const edgeIp =
      this.readHeaderValue(request, 'cf-connecting-ip') ||
      this.readHeaderValue(request, 'x-real-ip') ||
      this.readHeaderValue(request, 'x-client-ip') ||
      this.readHeaderValue(request, 'x-cluster-client-ip');

    const remoteAddress = request.socket?.remoteAddress?.trim();
    const directIp = request.ip?.trim();
    const clientAddress = forwardedIp || edgeIp?.trim() || directIp || remoteAddress;

    if (clientAddress) {
      return clientAddress;
    }

    const userAgent = this.readHeaderValue(request, 'user-agent')?.trim() || 'unknown-ua';
    const acceptLanguage =
      this.readHeaderValue(request, 'accept-language')?.trim() || 'unknown-lang';
    return `fallback:${userAgent}:${acceptLanguage}`;
  }

  private resolveOptionalViewer(request: HttpRequest): AuthUser | undefined {
    const authorizationHeader = request.headers.authorization;
    const rawAuthorization = Array.isArray(authorizationHeader)
      ? authorizationHeader[0]
      : authorizationHeader;

    if (!rawAuthorization?.startsWith('Bearer ')) {
      return undefined;
    }

    const token = rawAuthorization.slice('Bearer '.length).trim();
    if (!token) {
      return undefined;
    }

    try {
      const user = this.authService.verifyAccessToken(token);
      if (user.suspendedAt) {
        return undefined;
      }
      return user;
    } catch {
      return undefined;
    }
  }
}

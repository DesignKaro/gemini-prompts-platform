import { Transform } from 'class-transformer';
import { toOptionalBoolean } from '../../../../common/dto/query-transformers';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

function IsArrayValue(validationOptions?: ValidationOptions) {
  return (target: object, propertyName: string) => {
    registerDecorator({
      name: 'isArrayValue',
      target: target.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value === undefined || value === null) {
            return true;
          }
          return Array.isArray(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be an array`;
        },
      },
    });
  };
}

export class UpdateSeoSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(191)
  siteTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  titleSeparator?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  defaultMetaDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  homepageTitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  homepageDescription?: string | null;

  @IsOptional()
  @IsString()
  defaultOgImageUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  defaultOgImageAlt?: string | null;

  @IsOptional()
  @IsIn(['summary', 'summary_large_image'])
  twitterCardType?: 'summary' | 'summary_large_image';

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  schemaOrganizationEnabled?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  schemaWebsiteEnabled?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  schemaWebPageEnabled?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  schemaFaqEnabled?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  schemaCollectionEnabled?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  schemaArticleEnabled?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  schemaProfileEnabled?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  schemaBreadcrumbEnabled?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  schemaPromptEnabled?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  schemaSearchEnabled?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  robotsSiteIndex?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  robotsSiteFollow?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  robotsBlockAiBots?: boolean;

  @IsOptional()
  @IsArrayValue()
  @IsString({ each: true })
  robotsDisallowPaths?: string[];

  @IsOptional()
  @IsArrayValue()
  @IsString({ each: true })
  robotsAdditionalRules?: string[];

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  sitemapIncludePrompts?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  sitemapIncludePages?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  sitemapIncludePosts?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  sitemapIncludeNewsletter?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  sitemapIncludeTags?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  sitemapIncludeCategories?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  sitemapIncludeAuthors?: boolean;

  @IsOptional()
  @IsString()
  canonicalBaseUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  googleSiteVerification?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  bingSiteVerification?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  organizationName?: string | null;

  @IsOptional()
  @IsString()
  organizationLogoUrl?: string | null;

  @IsOptional()
  @IsArrayValue()
  @IsString({ each: true })
  organizationSameAs?: string[];

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  noindexSearchPages?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  noindexPaginatedArchives?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  noindexAuthorPages?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  noindexTagPages?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  noindexCategoryPages?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  noindexBlogArchivePages?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  noindexBlogPostPages?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  noindexStaticPages?: boolean;
}

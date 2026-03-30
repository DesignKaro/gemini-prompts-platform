import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSeoIntegrationsDto {
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
  @MaxLength(64)
  gaMeasurementId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  googleAdsTagId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  adsensePublisherId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  clarityProjectId?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customHeadScriptUrls?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  customHeadInlineScript?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  customBodyStartInlineScript?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  customBodyEndInlineScript?: string | null;
}

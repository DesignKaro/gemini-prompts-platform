import { IsIn, IsOptional } from 'class-validator';
import { SEO_INTEGRATION_SCOPES, type SeoIntegrationScope } from '../../../seo/seo-integration-scope';

export class SeoIntegrationsScopeQueryDto {
  @IsOptional()
  @IsIn([...SEO_INTEGRATION_SCOPES])
  scope?: SeoIntegrationScope;
}

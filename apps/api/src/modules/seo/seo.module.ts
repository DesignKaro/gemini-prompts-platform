import { Module } from '@nestjs/common';
import { RedirectRulesService } from './redirect-rules.service';
import { SeoIntegrationsService } from './seo-integrations.service';
import { SeoSettingsService } from './seo-settings.service';

@Module({
  providers: [SeoSettingsService, SeoIntegrationsService, RedirectRulesService],
  exports: [SeoSettingsService, SeoIntegrationsService, RedirectRulesService],
})
export class SeoModule {}

import { PartialType } from '@nestjs/swagger';
import { CreateRedirectRuleDto } from './create-redirect-rule.dto';

export class UpdateRedirectRuleDto extends PartialType(CreateRedirectRuleDto) {}

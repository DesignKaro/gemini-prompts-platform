import { PromptStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdatePromptStatusDto {
  @IsEnum(PromptStatus)
  status!: PromptStatus;
}

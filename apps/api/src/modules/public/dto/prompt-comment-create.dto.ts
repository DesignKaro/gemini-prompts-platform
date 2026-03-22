import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PromptCommentCreateDto {
  @IsString()
  @MaxLength(5000)
  content = '';

  @IsOptional()
  @IsString()
  parentId?: string;
}

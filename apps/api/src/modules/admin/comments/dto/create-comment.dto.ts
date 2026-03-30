import { CommentStatus, CommentTargetType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsEnum(CommentTargetType)
  targetType!: CommentTargetType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  targetId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;

  @IsOptional()
  @IsEnum(CommentStatus)
  status?: CommentStatus;
}

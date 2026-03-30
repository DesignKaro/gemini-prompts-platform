import { CommentStatus, CommentTargetType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { toOptionalTrimmedString } from '../../../../common/dto/query-transformers';
import { PaginationQueryDto } from '../../dto/pagination-query.dto';

export class ListCommentsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(CommentStatus)
  status?: CommentStatus;

  @IsOptional()
  @IsEnum(CommentTargetType)
  targetType?: CommentTargetType;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  @MaxLength(191)
  targetId?: string;
}

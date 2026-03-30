import { AuditAction, AuditTargetType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import {
  toOptionalInt,
  toOptionalTrimmedString,
} from '../../../../common/dto/query-transformers';
import { PaginationQueryDto } from '../../dto/pagination-query.dto';

export enum ActivitySortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListActivityQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  @MaxLength(191)
  actorId?: string;

  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  @IsEnum(AuditTargetType)
  targetType?: AuditTargetType;

  @IsOptional()
  @Transform(toOptionalInt)
  @IsInt()
  @Min(1)
  @Max(365)
  rangeDays?: number;

  @IsOptional()
  @IsEnum(ActivitySortOrder)
  sortOrder?: ActivitySortOrder;
}

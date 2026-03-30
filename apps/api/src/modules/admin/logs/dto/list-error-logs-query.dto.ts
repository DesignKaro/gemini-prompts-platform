import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { toOptionalInt, toOptionalTrimmedString } from '../../../../common/dto/query-transformers';

export enum ErrorLogLevelFilter {
  ERROR = 'error',
  WARN = 'warn',
  ALL = 'all',
}

export class ListErrorLogsQueryDto {
  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  @MaxLength(512)
  fileId?: string;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @Transform(toOptionalInt)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @IsOptional()
  @IsEnum(ErrorLogLevelFilter)
  level?: ErrorLogLevelFilter;
}


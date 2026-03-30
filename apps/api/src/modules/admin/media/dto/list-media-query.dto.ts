import { MediaStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsOptional } from 'class-validator';
import { toOptionalBoolean } from '../../../../common/dto/query-transformers';
import { PaginationQueryDto } from '../../dto/pagination-query.dto';

const mediaSortValues = ['recent', 'name'] as const;

export class ListMediaQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(MediaStatus)
  status?: MediaStatus;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  trash?: boolean;

  @IsOptional()
  @IsIn(mediaSortValues)
  sort?: (typeof mediaSortValues)[number];
}

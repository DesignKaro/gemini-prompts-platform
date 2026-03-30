import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { toOptionalBoolean } from '../../../../common/dto/query-transformers';
import { PaginationQueryDto } from '../../dto/pagination-query.dto';

const tagSortValues = ['recent', 'name'] as const;

export class ListTagsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  trash?: boolean;

  @IsOptional()
  @IsIn(tagSortValues)
  sort?: (typeof tagSortValues)[number];
}

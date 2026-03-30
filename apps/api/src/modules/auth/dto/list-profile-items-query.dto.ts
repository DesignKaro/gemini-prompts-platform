import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { toOptionalInt } from '../../../common/dto/query-transformers';
import { MAX_TAKE } from '../../../common/utils/pagination';

export class ListProfileItemsQueryDto {
  @IsOptional()
  @Transform(toOptionalInt)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Transform(toOptionalInt)
  @IsInt()
  @Min(1)
  @Max(MAX_TAKE)
  take?: number;
}

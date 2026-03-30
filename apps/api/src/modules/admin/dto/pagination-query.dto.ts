import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { MAX_TAKE } from '../../../common/utils/pagination';
import { toOptionalInt, toOptionalTrimmedString } from '../../../common/dto/query-transformers';

export class PaginationQueryDto {
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

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  @MaxLength(200)
  search?: string;
}

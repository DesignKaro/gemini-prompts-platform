import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { toOptionalInt, toOptionalTrimmedString } from '../../../../common/dto/query-transformers';

export class SearchResultsQueryDto {
  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @Transform(toOptionalInt)
  @IsInt()
  @Min(1)
  @Max(50)
  take?: number;
}

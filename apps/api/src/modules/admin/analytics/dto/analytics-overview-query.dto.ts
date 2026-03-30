import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { toOptionalInt } from '../../../../common/dto/query-transformers';

export class AnalyticsOverviewQueryDto {
  @IsOptional()
  @Transform(toOptionalInt)
  @IsInt()
  @Min(1)
  @Max(365)
  range?: number;
}

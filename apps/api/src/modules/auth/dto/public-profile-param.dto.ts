import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { toOptionalTrimmedString } from '../../../common/dto/query-transformers';

export class PublicProfileParamDto {
  @Transform(toOptionalTrimmedString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  handle!: string;
}

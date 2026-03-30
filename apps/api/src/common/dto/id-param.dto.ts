import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { toOptionalTrimmedString } from './query-transformers';

export class IdParamDto {
  @Transform(toOptionalTrimmedString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  id!: string;
}

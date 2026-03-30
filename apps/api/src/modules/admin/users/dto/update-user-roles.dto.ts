import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsString, MaxLength } from 'class-validator';
import { toOptionalStringArray } from '../../../../common/dto/query-transformers';

export class UpdateUserRolesDto {
  @Transform(toOptionalStringArray)
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(191, { each: true })
  roleIds!: string[];
}

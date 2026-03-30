import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { toOptionalBoolean } from '../../../../common/dto/query-transformers';

export class CreateRedirectRuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  sourcePath!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  destinationPath!: string;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isPermanent?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isActive?: boolean;
}

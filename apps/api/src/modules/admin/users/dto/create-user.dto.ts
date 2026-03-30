import { MembershipPlan, UserRole } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { toOptionalStringArray } from '../../../../common/dto/query-transformers';

export class CreateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string | null;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string | null;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(MembershipPlan)
  plan?: MembershipPlan;

  @IsOptional()
  @Transform(toOptionalStringArray)
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(191, { each: true })
  roleIds?: string[];
}

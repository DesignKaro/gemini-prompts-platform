import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'Handle can only contain letters, numbers, dots, underscores, and hyphens.',
  })
  handle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  profileTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  bio?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  focusTags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(5000000)
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  previousPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  confirmPassword?: string;
}

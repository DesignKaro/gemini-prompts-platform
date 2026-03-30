import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
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
}

import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
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
  @IsString({ each: true })
  focusTags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(5000000)
  avatarUrl?: string;
}

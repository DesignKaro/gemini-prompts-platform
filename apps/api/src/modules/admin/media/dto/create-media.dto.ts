import { MediaStatus } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const MAX_MEDIA_URL_LENGTH = 15_000_000;

export class CreateMediaDto {
  @IsOptional()
  @IsString()
  @MaxLength(280)
  title?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_MEDIA_URL_LENGTH)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  storageKey?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  mime?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  size?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  width?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  height?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  altText?: string | null;

  @IsOptional()
  @IsEnum(MediaStatus)
  status?: MediaStatus;
}

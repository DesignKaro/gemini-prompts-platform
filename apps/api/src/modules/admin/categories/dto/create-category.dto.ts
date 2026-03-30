import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Prisma } from '@prisma/client';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  parentId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000000)
  imageUrl?: string | null;

  @IsOptional()
  colorConfig?: Prisma.JsonValue | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

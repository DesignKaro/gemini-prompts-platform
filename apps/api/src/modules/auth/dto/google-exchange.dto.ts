import { IsOptional, IsString, MinLength } from 'class-validator';

export class GoogleExchangeDto {
  @IsOptional()
  @IsString()
  @MinLength(10)
  idToken?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  accessToken?: string;
}

import { IsString, MaxLength } from 'class-validator';

export class ResolveRedirectQueryDto {
  @IsString()
  @MaxLength(1024)
  path!: string;
}

import { Transform } from 'class-transformer';
import { IsDateString, IsOptional } from 'class-validator';

function toOptionalDateString(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export class SetUserMembershipDto {
  @IsOptional()
  @Transform(({ value }) => toOptionalDateString(value))
  @IsDateString()
  endAt?: string | null;
}

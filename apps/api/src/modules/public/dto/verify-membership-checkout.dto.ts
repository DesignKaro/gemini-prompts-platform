import { Transform } from 'class-transformer';
import { IsString, MaxLength } from 'class-validator';

export class VerifyMembershipCheckoutDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(128)
  razorpayOrderId = '';

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(128)
  razorpayPaymentId = '';

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(512)
  razorpaySignature = '';
}

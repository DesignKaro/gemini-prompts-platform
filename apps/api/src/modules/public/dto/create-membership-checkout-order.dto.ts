import { Transform } from 'class-transformer';
import { IsIn } from 'class-validator';

const MEMBERSHIP_CYCLES = ['monthly', 'yearly'] as const;

export type MembershipCycle = (typeof MEMBERSHIP_CYCLES)[number];

export class CreateMembershipCheckoutOrderDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsIn(MEMBERSHIP_CYCLES)
  cycle: MembershipCycle = 'monthly';
}

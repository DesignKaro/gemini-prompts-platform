export type MembershipCheckoutCycle = 'monthly' | 'yearly';

export type MembershipCheckoutOrderResponse = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  cycle: MembershipCheckoutCycle;
  plan: 'PREMIUM';
};

export type MembershipCheckoutVerifyResponse = {
  verified: boolean;
  alreadyProcessed: boolean;
  plan: 'PREMIUM';
  cycle: MembershipCheckoutCycle;
  activeUntil: string;
};

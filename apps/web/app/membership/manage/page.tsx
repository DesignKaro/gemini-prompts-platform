import type { Metadata } from 'next';
import { buildMetadata } from '../../../lib/seo';
import { MembershipManageClient } from './manage-client';

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: 'Manage Membership',
    description:
      'Review your Gemini Prompts membership status, access window, and billing history.',
    path: '/membership/manage',
    noIndex: true,
  });
}

export default function ManageMembershipPage() {
  return <MembershipManageClient />;
}

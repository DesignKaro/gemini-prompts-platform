import type { Metadata } from 'next';
import { buildMetadata } from '../../../lib/seo';
import { ProfileActivityClient } from './activity-client';

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: 'All Activity',
    description: 'View your full Gemini Prompts activity history.',
    path: '/profile/activity',
    noIndex: true,
  });
}

export default function ProfileActivityPage() {
  return <ProfileActivityClient />;
}

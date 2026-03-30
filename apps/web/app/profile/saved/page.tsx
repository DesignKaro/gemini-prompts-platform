import type { Metadata } from 'next';
import { buildMetadata } from '../../../lib/seo';
import { ProfileSavedClient } from './saved-client';

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: 'Saved Prompts',
    description: 'View and open all prompts you have saved on Gemini Prompts.',
    path: '/profile/saved',
    noIndex: true,
  });
}

export default function ProfileSavedPage() {
  return <ProfileSavedClient />;
}

import { redirect } from 'next/navigation';

export default function DashboardSavedPromptsRedirectPage() {
  redirect('/profile#saved-prompts');
}

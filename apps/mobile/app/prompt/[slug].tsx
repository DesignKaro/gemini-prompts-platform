import { useLocalSearchParams } from 'expo-router';
import { PromptDetailScreen } from '../../src/features/prompts/screens/prompt-detail-screen';

export default function PromptSlugRoute() {
  const params = useLocalSearchParams<{ slug?: string }>();
  return <PromptDetailScreen slug={params.slug} />;
}

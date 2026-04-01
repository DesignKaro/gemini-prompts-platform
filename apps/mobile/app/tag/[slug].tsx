import { useLocalSearchParams } from 'expo-router';
import { TagScreen } from '../../src/features/prompts/screens/tag-screen';

export default function TagSlugRoute() {
  const params = useLocalSearchParams<{ slug?: string }>();
  return <TagScreen slug={params.slug} />;
}

import { useLocalSearchParams } from 'expo-router';
import { AuthorScreen } from '../../src/features/profile/screens/author-screen';

export default function AuthorSlugRoute() {
  const params = useLocalSearchParams<{ slug?: string }>();
  return <AuthorScreen slug={params.slug} />;
}

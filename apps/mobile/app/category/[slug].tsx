import { useLocalSearchParams } from 'expo-router';
import { CategoryScreen } from '../../src/features/prompts/screens/category-screen';

export default function CategorySlugRoute() {
  const params = useLocalSearchParams<{ slug?: string }>();
  return <CategoryScreen slug={params.slug} />;
}

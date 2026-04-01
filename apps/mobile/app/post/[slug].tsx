import { useLocalSearchParams } from 'expo-router';
import { PostDetailScreen } from '../../src/features/posts/screens/post-detail-screen';

export default function PostSlugRoute() {
  const params = useLocalSearchParams<{ slug?: string }>();
  return <PostDetailScreen slug={params.slug} />;
}

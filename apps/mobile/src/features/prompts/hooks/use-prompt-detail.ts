import { useQuery } from '@tanstack/react-query';
import { getPromptBySlug } from '../../../api/public';

export function usePromptDetailQuery(slug: string | undefined) {
  return useQuery({
    queryKey: ['prompt', slug],
    queryFn: () => getPromptBySlug(slug as string),
    enabled: Boolean(slug),
  });
}

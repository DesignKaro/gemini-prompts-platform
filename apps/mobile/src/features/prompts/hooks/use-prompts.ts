import { useQuery } from '@tanstack/react-query';
import { getPrompts } from '../../../api/public';

type UsePromptsQueryInput = {
  search?: string;
  category?: string;
  tag?: string;
  author?: string;
  sort?: 'latest' | 'popular' | 'trending';
};

export function usePromptsQuery(input: UsePromptsQueryInput = {}) {
  return useQuery({
    queryKey: ['prompts', input],
    queryFn: () => getPrompts({ take: 20, ...input }),
  });
}

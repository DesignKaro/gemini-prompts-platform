import { useQuery } from '@tanstack/react-query';
import { getHome } from '../../../api/public';

export function useHomeQuery() {
  return useQuery({
    queryKey: ['home'],
    queryFn: () => getHome(),
  });
}

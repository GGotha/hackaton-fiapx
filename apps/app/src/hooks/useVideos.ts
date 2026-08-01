import type { PaginatedResult, VideoDto } from '@fiapx/contracts';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export const VIDEOS_KEY = 'videos';

export function videosQueryKey(page: number, pageSize: number) {
  return [VIDEOS_KEY, page, pageSize] as const;
}

export function useVideos(page: number, pageSize: number, enabled: boolean) {
  return useQuery({
    queryKey: videosQueryKey(page, pageSize),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResult<VideoDto>>('/videos', {
        params: { page, pageSize },
      });
      return data;
    },
    enabled,
    placeholderData: keepPreviousData,
  });
}

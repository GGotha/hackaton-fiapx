import type { DownloadUrlDto } from '@fiapx/contracts';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useDownload() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.get<DownloadUrlDto>(`/videos/${id}/download`);
      return data;
    },
    onSuccess: (data) => {
      window.open(data.url, '_blank', 'noopener,noreferrer');
    },
  });
}

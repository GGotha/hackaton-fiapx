import type { UploadAcceptedDto } from '@fiapx/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';
import { VIDEOS_KEY } from './useVideos';

export function useUpload() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      setProgress(0);
      const form = new FormData();
      form.append('file', file);

      const { data } = await api.post<UploadAcceptedDto>('/videos', form, {
        onUploadProgress: (event) => {
          if (event.total) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [VIDEOS_KEY] });
    },
  });

  return { ...mutation, progress };
}

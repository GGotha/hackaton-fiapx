import {
  type PaginatedResult,
  type VideoDto,
  type VideoStatusChanged,
  WsEvent,
} from '@fiapx/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createSocket } from '../lib/socket';
import { VIDEOS_KEY } from './useVideos';

export function useVideoSocket(token: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) {
      return;
    }

    const socket = createSocket(token);

    const handleStatusChange = (payload: VideoStatusChanged) => {
      // Patch cached pages for instant feedback, then reconcile with the server.
      queryClient.setQueriesData<PaginatedResult<VideoDto>>(
        { queryKey: [VIDEOS_KEY] },
        (current) => {
          if (!current) {
            return current;
          }
          return {
            ...current,
            items: current.items.map((item) =>
              item.id === payload.videoId
                ? {
                    ...item,
                    status: payload.status,
                    frameCount: payload.frameCount,
                    error: payload.error,
                    updatedAt: payload.updatedAt,
                  }
                : item,
            ),
          };
        },
      );
      queryClient.invalidateQueries({ queryKey: [VIDEOS_KEY] });
    };

    socket.on(WsEvent.StatusChanged, handleStatusChange);

    return () => {
      socket.off(WsEvent.StatusChanged, handleStatusChange);
      socket.disconnect();
    };
  }, [token, queryClient]);
}

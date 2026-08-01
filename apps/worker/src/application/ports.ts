import type { VideoStatusChanged } from '@fiapx/contracts';

export interface FrameExtractor {
  extract(inputPath: string, outputDir: string, fps: number): Promise<number>;
}

export interface Archiver {
  zipDirectory(dir: string): Promise<Buffer>;
}

export interface StatusPublisher {
  publish(event: VideoStatusChanged): Promise<void>;
}

export const FRAME_EXTRACTOR = Symbol('FRAME_EXTRACTOR');
export const ARCHIVER = Symbol('ARCHIVER');
export const STATUS_PUBLISHER = Symbol('STATUS_PUBLISHER');

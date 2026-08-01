import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import ffmpegStatic from 'ffmpeg-static';
import type { FrameExtractor } from '../application/ports';

const FFMPEG_PATH = process.env.FFMPEG_PATH || ffmpegStatic || 'ffmpeg';
const FFMPEG_TIMEOUT_MS = Number(process.env.FFMPEG_TIMEOUT_MS ?? 300_000);

@Injectable()
export class FfmpegFrameExtractor implements FrameExtractor {
  async extract(inputPath: string, outputDir: string, fps: number): Promise<number> {
    await this.run([
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      inputPath,
      '-vf',
      `fps=${fps}`,
      join(outputDir, 'frame_%05d.png'),
    ]);

    const files = await readdir(outputDir);
    return files.filter((file) => file.endsWith('.png')).length;
  }

  private run(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(FFMPEG_PATH, args, { stdio: ['ignore', 'ignore', 'pipe'] });
      let stderr = '';
      let settled = false;

      const settle = (fn: () => void) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        fn();
      };

      const timer = setTimeout(() => {
        proc.kill('SIGKILL');
        settle(() => reject(new Error(`ffmpeg timed out after ${FFMPEG_TIMEOUT_MS}ms`)));
      }, FFMPEG_TIMEOUT_MS);

      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
      proc.on('error', (err) => settle(() => reject(err)));
      proc.on('close', (code) => {
        settle(() =>
          code === 0
            ? resolve()
            : reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`)),
        );
      });
    });
  }
}

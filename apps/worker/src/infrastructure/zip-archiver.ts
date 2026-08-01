import { Injectable } from '@nestjs/common';
import { ZipArchive } from 'archiver';
import type { Archiver as ArchiverPort } from '../application/ports';

@Injectable()
export class ZipArchiver implements ArchiverPort {
  zipDirectory(dir: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const archive = new ZipArchive({ zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('warning', reject);
      archive.on('error', reject);
      archive.on('end', () => resolve(Buffer.concat(chunks)));

      archive.directory(dir, false);
      void archive.finalize();
    });
  }
}

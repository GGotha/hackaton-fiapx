import { Module } from '@nestjs/common';
import { GetDownloadUrlUseCase } from './application/get-download-url.use-case';
import { GetVideoUseCase } from './application/get-video.use-case';
import { ListVideosUseCase } from './application/list-videos.use-case';
import { UploadVideoUseCase } from './application/upload-video.use-case';
import { VIDEO_REPOSITORY } from './domain/video-repository';
import { PgVideoRepository } from './infrastructure/pg-video.repository';
import { JwtGuard } from './interface/auth/jwt.guard';
import { JwtVerifier } from './interface/auth/jwt-verifier';
import { VideosController } from './interface/http/videos.controller';
import { VideoStatusGateway } from './interface/ws/video-status.gateway';

@Module({
  controllers: [VideosController],
  providers: [
    UploadVideoUseCase,
    ListVideosUseCase,
    GetVideoUseCase,
    GetDownloadUrlUseCase,
    { provide: VIDEO_REPOSITORY, useClass: PgVideoRepository },
    JwtVerifier,
    JwtGuard,
    VideoStatusGateway,
  ],
})
export class VideosModule {}

import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../application/authenticated-user';
import { GetDownloadUrlUseCase } from '../../application/get-download-url.use-case';
import { GetVideoUseCase } from '../../application/get-video.use-case';
import { ListVideosUseCase } from '../../application/list-videos.use-case';
import {
  type UploadedVideoFile,
  UploadVideoUseCase,
} from '../../application/upload-video.use-case';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtGuard } from '../auth/jwt.guard';
import { ListVideosQuery } from './dto/list-videos.query';

const MAX_VIDEO_BYTES = Number(process.env.MAX_VIDEO_MB ?? 200) * 1024 * 1024;

@ApiTags('videos')
@ApiBearerAuth()
@Controller('videos')
@UseGuards(JwtGuard)
export class VideosController {
  constructor(
    private readonly uploadVideo: UploadVideoUseCase,
    private readonly listVideos: ListVideosUseCase,
    private readonly getVideo: GetVideoUseCase,
    private readonly getDownloadUrl: GetDownloadUrlUseCase,
  ) {}

  @Post()
  @HttpCode(202)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_VIDEO_BYTES } }))
  upload(@CurrentUser() user: AuthenticatedUser, @UploadedFile() file?: UploadedVideoFile) {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    return this.uploadVideo.execute(user, file);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListVideosQuery) {
    return this.listVideos.execute(user.id, query.page, query.pageSize);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.getVideo.execute(id, user.id);
  }

  @Get(':id/download')
  download(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.getDownloadUrl.execute(id, user.id);
  }
}

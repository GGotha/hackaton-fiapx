export class VideoNotFoundError extends Error {
  constructor(id: string) {
    super(`Video ${id} not found`);
    this.name = 'VideoNotFoundError';
  }
}

export class VideoNotReadyError extends Error {
  constructor(id: string) {
    super(`Video ${id} is not ready for download`);
    this.name = 'VideoNotReadyError';
  }
}

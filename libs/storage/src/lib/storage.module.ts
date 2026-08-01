import { type DynamicModule, Global, Module } from '@nestjs/common';
import { type StorageOptions, StorageService } from './storage.service';

@Global()
@Module({})
export class StorageModule {
  static forRoot(options: StorageOptions): DynamicModule {
    return {
      module: StorageModule,
      providers: [{ provide: StorageService, useValue: new StorageService(options) }],
      exports: [StorageService],
    };
  }
}

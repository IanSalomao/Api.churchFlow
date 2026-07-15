import { Module } from '@nestjs/common';
import { MinistriesController } from './ministries.controller';
import { MinistriesService } from './ministries.service';

@Module({
  controllers: [MinistriesController],
  providers: [MinistriesService],
})
export class MinistriesModule {}

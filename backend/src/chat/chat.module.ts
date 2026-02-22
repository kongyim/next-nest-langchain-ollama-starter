import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { AiService } from './chat.service';
import { ChatModelFactory } from './providers/chat-model.factory';

@Module({
  controllers: [ChatController],
  providers: [AiService, ChatModelFactory],
  exports: [AiService],
})
export class ChatModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatController } from './chat.controller';
import { AiService } from './chat.service';
import { ChatModelFactory } from './providers/chat-model.factory';

@Module({
  imports: [AuthModule],
  controllers: [ChatController],
  providers: [AiService, ChatModelFactory],
  exports: [AiService],
})
export class ChatModule {}

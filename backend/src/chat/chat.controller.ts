import {
  Controller,
  Delete,
  Get,
  MessageEvent,
  Param,
  Post,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AiService } from './chat.service';

@Controller('chat')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly aiService: AiService) {}

  @Get('sessions')
  listSessions(@CurrentUser('sub') userId: string) {
    return this.aiService.listSessions(userId);
  }

  @Post('sessions')
  createSession(@CurrentUser('sub') userId: string) {
    return this.aiService.createSession(userId);
  }

  @Get('sessions/:sessionId/messages')
  getSessionMessages(
    @CurrentUser('sub') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.aiService.getSessionMessages(userId, sessionId);
  }

  @Delete('sessions/:sessionId')
  deleteSession(
    @CurrentUser('sub') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.aiService.deleteSession(userId, sessionId);
  }

  @Sse('stream')
  stream(
    @CurrentUser('sub') userId: string,
    @Query('message') message: string,
    @Query('sessionId') sessionId?: string,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      if (!message?.trim()) {
        subscriber.error(new Error('Query param "message" is required.'));
        return;
      }

      if (!sessionId?.trim()) {
        subscriber.error(new Error('Query param "sessionId" is required.'));
        return;
      }

      const run = async () => {
        try {
          for await (const token of this.aiService.streamChat(message, userId, sessionId)) {
            subscriber.next({ data: token });
          }
          subscriber.next({ data: '[DONE]' });
          subscriber.complete();
        } catch (error) {
          subscriber.error(error);
        }
      };

      void run();
    });
  }
}

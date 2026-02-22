import { Controller, MessageEvent, Query, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AiService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly aiService: AiService) {}

  @Sse('stream')
  stream(
    @Query('message') message: string,
    @Query('sessionId') sessionId?: string,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      if (!message?.trim()) {
        subscriber.error(new Error('Query param "message" is required.'));
        return;
      }

      const run = async () => {
        try {
          for await (const token of this.aiService.streamChat(message, sessionId)) {
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

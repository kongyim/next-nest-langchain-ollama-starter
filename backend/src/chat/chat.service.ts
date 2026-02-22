import { Injectable } from '@nestjs/common';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { BufferMemory } from 'langchain/memory';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatModelFactory } from './providers/chat-model.factory';

@Injectable()
export class AiService {
  private readonly memories = new Map<string, BufferMemory>();

  constructor(private readonly chatModelFactory: ChatModelFactory) {}

  private getMemory(sessionId: string): BufferMemory {
    const current = this.memories.get(sessionId);
    if (current) return current;

    const memory = new BufferMemory({
      returnMessages: true,
      memoryKey: 'history',
      inputKey: 'input',
      outputKey: 'output',
    });

    this.memories.set(sessionId, memory);
    return memory;
  }

  async *streamChat(input: string, sessionId = 'default'): AsyncGenerator<string> {
    const model: BaseChatModel = this.chatModelFactory.create();
    const memory = this.getMemory(sessionId);

    const memoryVars = await memory.loadMemoryVariables({});
    const history = (memoryVars.history as Array<HumanMessage | AIMessage>) ?? [];

    const messages = [
      new SystemMessage('You are a concise and helpful AI assistant.'),
      ...history,
      new HumanMessage(input),
    ];

    let fullResponse = '';
    const stream = await model.stream(messages);

    for await (const chunk of stream) {
      const text = this.extractChunkText(chunk.content);
      if (!text) continue;
      fullResponse += text;
      yield text;
    }

    await memory.saveContext({ input }, { output: fullResponse });
  }

  private extractChunkText(content: unknown): string {
    if (typeof content === 'string') return content;

    if (Array.isArray(content)) {
      return content
        .map((part) => {
          if (typeof part === 'string') return part;
          if (typeof part === 'object' && part && 'text' in part) {
            const text = (part as { text?: unknown }).text;
            return typeof text === 'string' ? text : '';
          }
          return '';
        })
        .join('');
    }

    return '';
  }
}

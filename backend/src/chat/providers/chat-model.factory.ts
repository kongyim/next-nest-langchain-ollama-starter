import { Injectable } from '@nestjs/common';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatModelProvider } from './chat-model.provider';

@Injectable()
export class ChatModelFactory implements ChatModelProvider {
  create(): BaseChatModel {
    const provider = (process.env.AI_PROVIDER ?? 'ollama').toLowerCase();
    const model = process.env.AI_MODEL_NAME ?? 'llama3.1';

    if (provider === 'openai') {
      return new ChatOpenAI({
        model,
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    if (provider === 'anthropic') {
      return new ChatAnthropic({
        model,
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }

    return new ChatOllama({
      model,
      baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
      temperature: 0.2,
    });
  }
}

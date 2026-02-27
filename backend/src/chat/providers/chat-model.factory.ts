import { Injectable } from '@nestjs/common';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatModelProvider } from './chat-model.provider';

@Injectable()
export class ChatModelFactory implements ChatModelProvider {
  create(): BaseChatModel {
    const provider = (process.env.AI_PROVIDER ?? 'ollama').toLowerCase();
    const model = process.env.AI_MODEL_NAME ?? 'llama3.1';

    if (provider === 'openai') {
      const ChatOpenAI = this.resolveChatOpenAI();
      return new ChatOpenAI({
        model,
        apiKey: process.env.OPENAI_API_KEY,
      }) as unknown as BaseChatModel;
    }

    if (provider === 'anthropic') {
      const ChatAnthropic = this.resolveChatAnthropic();
      return new ChatAnthropic({
        model,
        apiKey: process.env.ANTHROPIC_API_KEY,
      }) as unknown as BaseChatModel;
    }

    const ChatOllama = this.resolveChatOllama();

    return new ChatOllama({
      model,
      baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
      temperature: 0.2,
    }) as unknown as BaseChatModel;
  }

  private resolveChatOllama(): new (input: {
    model: string;
    baseUrl: string;
    temperature: number;
  }) => unknown {
    try {
      // LangChain v1 package split
      return require('@langchain/ollama').ChatOllama;
    } catch {
      try {
        // LangChain v0.x community path
        return require('@langchain/community/chat_models/ollama').ChatOllama;
      } catch {
        throw new Error(
          'ChatOllama package not found. Install "@langchain/ollama" (preferred) or "@langchain/community".',
        );
      }
    }
  }

  private resolveChatOpenAI(): new (input: {
    model: string;
    apiKey?: string;
  }) => unknown {
    return require('@langchain/openai').ChatOpenAI;
  }

  private resolveChatAnthropic(): new (input: {
    model: string;
    apiKey?: string;
  }) => unknown {
    return require('@langchain/anthropic').ChatAnthropic;
  }
}

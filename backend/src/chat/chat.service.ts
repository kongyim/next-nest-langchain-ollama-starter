import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ChatRole } from '@prisma/client';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { PrismaService } from '../prisma/prisma.service';
import { ChatModelFactory } from './providers/chat-model.factory';
import { TrainingService } from '../training/training.service';

@Injectable()
export class AiService {
  constructor(
    private readonly chatModelFactory: ChatModelFactory,
    private readonly prisma: PrismaService,
    private readonly trainingService: TrainingService,
  ) {}

  async createSession(userId: string) {
    const session = await this.prisma.chatSession.create({
      data: {
        userId,
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...session,
      preview: '',
    };
  }

  async listSessions(userId: string) {
    const sessions = await this.prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            content: true,
          },
        },
      },
    });

    return sessions.map((session) => ({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      preview: session.messages[0]?.content ?? '',
    }));
  }

  async getSessionMessages(userId: string, sessionId: string) {
    await this.ensureSessionOwnership(userId, sessionId);

    return this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });
  }

  async deleteSession(userId: string, sessionId: string) {
    await this.ensureSessionOwnership(userId, sessionId);

    await this.prisma.chatSession.delete({
      where: { id: sessionId },
    });

    return { ok: true };
  }

  async *streamChat(input: string, userId: string, sessionId: string): AsyncGenerator<string> {
    const trimmed = input.trim();
    if (!trimmed) return;

    const model: BaseChatModel = this.chatModelFactory.create();
    const session = await this.ensureSessionOwnership(userId, sessionId);

    const previousMessages = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      select: {
        role: true,
        content: true,
      },
    });

    const shouldSetTitle = !session.title;
    const title = shouldSetTitle ? trimmed.slice(0, 60) : undefined;

    await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: ChatRole.USER,
        content: trimmed,
      },
    });

    const trainingSources = this.trainingService.search(trimmed, 3);
    const contextBlock = trainingSources
      .map((source, index) => `Source ${index + 1} (${source.title}): ${source.snippet}`)
      .join('\n');

    const systemPrompt = contextBlock
      ? `You are a concise and helpful AI assistant.
Use the training context below when it is relevant.
If the context is not enough to answer confidently, say that clearly.

Training context:
${contextBlock}`
      : 'You are a concise and helpful AI assistant.';

    const messages = [
      new SystemMessage(systemPrompt),
      ...previousMessages.map((message) =>
        message.role === ChatRole.USER
          ? new HumanMessage(message.content)
          : new AIMessage(message.content),
      ),
      new HumanMessage(trimmed),
    ];

    let fullResponse = '';
    const stream = await model.stream(messages);

    for await (const chunk of stream) {
      const text = this.extractChunkText(chunk.content);
      if (!text) continue;
      fullResponse += text;
      yield text;
    }

    await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: ChatRole.ASSISTANT,
        content: fullResponse,
      },
    });

    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        title,
        updatedAt: new Date(),
      },
    });
  }

  private async ensureSessionOwnership(userId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        userId: true,
        title: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Chat session not found.');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('You cannot access this chat session.');
    }

    return session;
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

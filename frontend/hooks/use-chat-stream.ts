'use client';

import { useCallback, useMemo, useState } from 'react';

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ??
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : 'http://localhost:3001');

export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string, sessionId = 'default') => {
    const trimmed = content.trim();
    if (!trimmed || isStreaming) return;
    setError(null);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    const assistantId = crypto.randomUUID();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsStreaming(true);

    try {
      const qs = new URLSearchParams({ message: trimmed, sessionId });
      const response = await fetch(`${API_URL}/chat/stream?${qs.toString()}`, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
        },
      });

      if (!response.ok || !response.body) {
        throw new Error(`Streaming request failed (${response.status}).`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const event of events) {
          const dataLines = event
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.replace(/^data:\s?/, ''));

          for (const data of dataLines) {
            if (!data || data === '[DONE]') continue;

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, content: `${msg.content}${data}` }
                  : msg,
              ),
            );
          }
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to connect to chat server.';
      setError(message);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                content:
                  'Connection error. Make sure backend is running on `http://localhost:3001` and try again.',
              }
            : msg,
        ),
      );
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming]);

  const history = useMemo(
    () => messages.filter((msg) => msg.role === 'user'),
    [messages],
  );

  return {
    messages,
    history,
    isStreaming,
    error,
    sendMessage,
  };
}

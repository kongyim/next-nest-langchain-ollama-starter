'use client';

import { FormEvent, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useChatStream } from '@/hooks/use-chat-stream';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ChatBox() {
  const [input, setInput] = useState('');
  const { messages, history, isStreaming, sendMessage } = useChatStream();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = input;
    setInput('');
    await sendMessage(message);
  };

  return (
    <div className="grid h-screen grid-cols-1 bg-slate-100 p-4 md:grid-cols-[280px_1fr] md:gap-4">
      <Card className="hidden overflow-hidden md:flex md:flex-col">
        <div className="border-b px-4 py-3 text-sm font-semibold">History</div>
        <ScrollArea className="h-full px-2 py-3">
          <div className="space-y-2">
            {history.length === 0 && (
              <p className="px-2 text-sm text-slate-500">No chats yet.</p>
            )}
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full rounded-md border bg-white p-2 text-left text-sm hover:bg-slate-50"
              >
                {item.content.slice(0, 60)}
              </button>
            ))}
          </div>
        </ScrollArea>
      </Card>

      <Card className="flex min-h-0 flex-col overflow-hidden">
        <div className="border-b px-4 py-3 text-sm font-semibold">AI Assistant</div>

        <ScrollArea className="flex-1 px-4 py-4">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
            {messages.length === 0 && (
              <p className="text-center text-sm text-slate-500">
                Ask a question to start streaming with LangChain + Ollama.
              </p>
            )}

            {messages.map((message) => {
              const isUser = message.role === 'user';
              return (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <Avatar>
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                      isUser ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
                    }`}
                  >
                    <ReactMarkdown>{message.content || (isStreaming ? '...' : '')}</ReactMarkdown>
                  </div>

                  {isUser && (
                    <Avatar>
                      <AvatarFallback>ME</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <form onSubmit={onSubmit} className="border-t bg-white p-3">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-2">
            <Input
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isStreaming}
            />
            <Button type="submit" disabled={isStreaming || !input.trim()}>
              {isStreaming ? 'Streaming...' : 'Send'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

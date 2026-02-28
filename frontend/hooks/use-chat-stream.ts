'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string | null;
  preview: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthUser {
  id: string;
  email: string;
  preferredTheme: 'LIGHT' | 'DARK';
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ??
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : 'http://localhost:3001');

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export function useChatStream() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = window.localStorage.getItem('auth_token');
    if (!savedToken) return;

    void verifySession(savedToken);
  }, []);

  const verifySession = useCallback(async (candidateToken: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${candidateToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Session expired.');
      }

      const data = (await response.json()) as { user: AuthUser | null };
      if (!data.user) {
        throw new Error('Invalid session user.');
      }

      setToken(candidateToken);
      setUser(data.user);
      window.localStorage.setItem('auth_token', candidateToken);
      await loadSessions(candidateToken);
    } catch {
      logout();
    }
  }, []);

  const loadMessages = useCallback(async (sessionId: string, accessToken = token) => {
    if (!accessToken) return;

    setIsLoadingSession(true);
    try {
      const response = await fetch(`${API_URL}/chat/sessions/${sessionId}/messages`, {
        cache: 'no-store',
        headers: authHeaders(accessToken),
      });

      if (!response.ok) {
        throw new Error('Failed to load conversation.');
      }

      const data = (await response.json()) as Array<{
        id: string;
        role: 'USER' | 'ASSISTANT';
        content: string;
        createdAt: string;
      }>;

      setMessages(
        data.map((item) => ({
          id: item.id,
          role: item.role === 'USER' ? 'user' : 'assistant',
          content: item.content,
          createdAt: item.createdAt,
        })),
      );
    } finally {
      setIsLoadingSession(false);
    }
  }, [token]);

  const loadSessions = useCallback(async (
    accessToken = token,
    preferredSessionId?: string | null,
    syncMessages = true,
  ) => {
    if (!accessToken) return;

    const response = await fetch(`${API_URL}/chat/sessions`, {
      cache: 'no-store',
      headers: authHeaders(accessToken),
    });

    if (!response.ok) {
      throw new Error('Failed to load chat sessions.');
    }

    const data = (await response.json()) as ChatSession[];
    setSessions(data);

    if (data.length > 0) {
      const hasPreferred = !!preferredSessionId && data.some((session) => session.id === preferredSessionId);
      const hasCurrent = !!currentSessionId && data.some((session) => session.id === currentSessionId);
      const nextSessionId = hasPreferred
        ? (preferredSessionId as string)
        : hasCurrent
          ? (currentSessionId as string)
          : data[0].id;
      setCurrentSessionId(nextSessionId);
      if (syncMessages) {
        await loadMessages(nextSessionId, accessToken);
      }
      return;
    }

    setCurrentSessionId(null);
    setMessages([]);
  }, [token, currentSessionId, loadMessages]);

  const createSession = useCallback(async (accessToken = token) => {
    if (!accessToken) return null;

    const response = await fetch(`${API_URL}/chat/sessions`, {
      method: 'POST',
      cache: 'no-store',
      headers: authHeaders(accessToken),
    });

    if (!response.ok) {
      throw new Error('Failed to create new chat.');
    }

    const data = (await response.json()) as ChatSession;
    setSessions((prev) => [data, ...prev]);
    setCurrentSessionId(data.id);
    setMessages([]);
    return data.id;
  }, [token]);

  const selectSession = useCallback(async (sessionId: string) => {
    if (!token) return;
    setCurrentSessionId(sessionId);
    await loadMessages(sessionId, token);
  }, [loadMessages, token]);

  const deleteSession = useCallback(async (sessionId: string) => {
    if (!token) return;
    setError(null);

    try {
      const response = await fetch(`${API_URL}/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        cache: 'no-store',
        headers: authHeaders(token),
      });

      if (!response.ok) {
        throw new Error('Failed to delete chat.');
      }

      const remaining = sessions.filter((session) => session.id !== sessionId);
      setSessions(remaining);

      if (currentSessionId === sessionId) {
        const nextSessionId = remaining[0]?.id ?? null;
        setCurrentSessionId(nextSessionId);
        if (nextSessionId) {
          await loadMessages(nextSessionId, token);
        } else {
          setMessages([]);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete chat.';
      setError(message);
    }
  }, [token, sessions, currentSessionId, loadMessages]);

  const authRequest = useCallback(async (
    mode: 'login' | 'register',
    email: string,
    password: string,
  ) => {
    const response = await fetch(`${API_URL}/auth/${mode}`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = (await response.json()) as { token?: string; user?: AuthUser; message?: string };

    if (!response.ok || !data.token || !data.user) {
      const fallback = mode === 'register' ? 'registration failed.' : 'login failed.';
      throw new Error(data.message ?? fallback);
    }

    setToken(data.token);
    setUser(data.user);
    window.localStorage.setItem('auth_token', data.token);
    await loadSessions(data.token);
  }, [loadSessions]);

  const updateThemePreference = useCallback(async (themeMode: 'light' | 'dark') => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/auth/preferences`, {
        method: 'POST',
        cache: 'no-store',
        headers: authHeaders(token),
        body: JSON.stringify({ themeMode }),
      });

      if (!response.ok) {
        throw new Error('Failed to update theme preference.');
      }

      const data = (await response.json()) as { user?: AuthUser };
      if (data.user) {
        setUser(data.user);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update theme preference.';
      setError(message);
    }
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await authRequest('login', email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'login failed.';
      setError(message);
    }
  }, [authRequest]);

  const register = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await authRequest('register', email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'registration failed.';
      setError(message);
    }
  }, [authRequest]);

  const logout = useCallback(() => {
    window.localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
    setSessions([]);
    setCurrentSessionId(null);
    setMessages([]);
    setError(null);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isStreaming || !token) return;

    setError(null);
    let assistantId = '';
    setIsStreaming(true);

    try {
      let sessionId = currentSessionId;
      if (!sessionId) {
        sessionId = await createSession(token);
        if (!sessionId) {
          throw new Error('Unable to create session.');
        }
      }

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString(),
      };

      assistantId = crypto.randomUUID();
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      const qs = new URLSearchParams({ message: trimmed, sessionId });
      const response = await fetch(`${API_URL}/chat/stream?${qs.toString()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
        },
      });

      if (!response.ok || !response.body) {
        throw new Error(`Streaming request failed (${response.status}).`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let tokenCount = 0;

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
            tokenCount += 1;

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

      if (tokenCount === 0) {
        setError('No response from model. Please check backend logs / model setup.');
      }

      await loadMessages(sessionId, token);
      await loadSessions(token, sessionId, false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to connect to chat server.';
      setError(message);
      if (assistantId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  content: 'Connection error. Please try again.',
                }
              : msg,
          ),
        );
      }
    } finally {
      setIsStreaming(false);
    }
  }, [createSession, currentSessionId, isStreaming, loadSessions, token]);

  const history = useMemo(() => sessions, [sessions]);

  return {
    token,
    user,
    messages,
    history,
    currentSessionId,
    isStreaming,
    isLoadingSession,
    error,
    login,
    register,
    logout,
    sendMessage,
    createSession,
    selectSession,
    deleteSession,
    updateThemePreference,
  };
}

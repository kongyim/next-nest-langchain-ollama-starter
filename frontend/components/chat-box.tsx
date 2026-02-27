'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LightModeIcon from '@mui/icons-material/LightMode';
import LogoutIcon from '@mui/icons-material/Logout';
import { useColorMode } from '@/app/mui-provider';
import { useChatStream } from '@/hooks/use-chat-stream';

export function ChatBox() {
  const [input, setInput] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const {
    token,
    user,
    messages,
    history,
    currentSessionId,
    isStreaming,
    isLoadingSession,
    error,
    login,
    logout,
    sendMessage,
    createSession,
    selectSession,
    deleteSession,
    updateThemePreference,
  } = useChatStream();

  const sortedMessages = useMemo(() => messages, [messages]);
  const { mode, setColorMode } = useColorMode();

  useEffect(() => {
    if (!user) return;
    const nextMode = user.preferredTheme === 'DARK' ? 'dark' : 'light';
    setColorMode(nextMode);
  }, [setColorMode, user]);

  const handleToggleMode = () => {
    const nextMode = mode === 'dark' ? 'light' : 'dark';
    setColorMode(nextMode);
    if (token) {
      void updateThemePreference(nextMode);
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = input;
    setInput('');
    await sendMessage(message);
  };

  const onLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await login(email, password);
  };

  if (!token) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
        <Paper elevation={2} sx={{ width: '100%', maxWidth: 420, p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="h5" fontWeight={700}>
              Login
            </Typography>
            <IconButton onClick={handleToggleMode} aria-label="Toggle dark mode">
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Sign in to see your chat history and continue conversations.
          </Typography>

          <Stack component="form" spacing={1.5} onSubmit={onLogin}>
            <TextField
              label="Email"
              type="email"
              size="small"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextField
              label="Password"
              type="password"
              size="small"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" variant="contained" fullWidth>
              Log in
            </Button>
          </Stack>

          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 1.5 }}>
              {error}
            </Typography>
          )}
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', p: 1.5 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '300px 1fr' }, gap: 1.5, height: '100%' }}>
        <Paper sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ p: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  History
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.email}
                </Typography>
              </Box>
              <IconButton size="small" onClick={handleToggleMode} aria-label="Toggle dark mode">
                {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </IconButton>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button
                size="small"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => void createSession()}
              >
                New chat
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                startIcon={<LogoutIcon />}
                onClick={logout}
              >
                Logout
              </Button>
            </Stack>
          </Box>
          <Divider />
          <Box sx={{ overflowY: 'auto', flex: 1 }}>
            <List dense>
              {history.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                  No chats yet.
                </Typography>
              )}
              {history.map((item) => {
                const isActive = currentSessionId === item.id;
                const label = item.title || item.preview || 'New chat';

                return (
                  <Box key={item.id} sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <ListItemButton
                      selected={isActive}
                      onClick={() => void selectSession(item.id)}
                      sx={{ alignItems: 'flex-start', flex: 1 }}
                    >
                      <ListItemText
                        primary={label.slice(0, 60)}
                        secondary={(item.preview || 'No messages').slice(0, 90)}
                        primaryTypographyProps={{ noWrap: true, fontWeight: 600, fontSize: 13 }}
                        secondaryTypographyProps={{ noWrap: true, fontSize: 12 }}
                      />
                    </ListItemButton>
                    <IconButton
                      size="small"
                      sx={{ mt: 0.75, mr: 0.5 }}
                      onClick={(event) => {
                        event.stopPropagation();
                        void deleteSession(item.id);
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                );
              })}
            </List>
          </Box>
        </Paper>

        <Paper sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ p: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1" fontWeight={700}>
                AI Assistant
              </Typography>
              <IconButton
                size="small"
                onClick={handleToggleMode}
                aria-label="Toggle dark mode"
                sx={{ display: { xs: 'inline-flex', md: 'none' } }}
              >
                {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </IconButton>
            </Stack>
          </Box>
          <Divider />

          <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5 }}>
            <Stack spacing={1.5} sx={{ maxWidth: 960, mx: 'auto' }}>
              {isLoadingSession && (
                <Typography variant="body2" color="text.secondary">
                  Loading conversation...
                </Typography>
              )}

              {!isLoadingSession && sortedMessages.length === 0 && (
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Select a chat on the left, or start a new one.
                </Typography>
              )}

              {sortedMessages.map((message) => {
                const isUser = message.role === 'user';

                return (
                  <Stack
                    key={message.id}
                    direction="row"
                    spacing={1}
                    justifyContent={isUser ? 'flex-end' : 'flex-start'}
                    alignItems="flex-start"
                  >
                    {!isUser && <Avatar sx={{ width: 32, height: 32 }}>AI</Avatar>}

                    <Paper
                      variant="outlined"
                      sx={{
                        px: 1.5,
                        py: 1,
                        maxWidth: '80%',
                        bgcolor: isUser ? 'primary.main' : 'background.paper',
                        color: isUser ? 'primary.contrastText' : 'text.primary',
                      }}
                    >
                      <Typography component="div" variant="body2" sx={{ lineHeight: 1.65 }}>
                        <ReactMarkdown>{message.content || (isStreaming ? '...' : '')}</ReactMarkdown>
                      </Typography>
                    </Paper>

                    {isUser && <Avatar sx={{ width: 32, height: 32 }}>ME</Avatar>}
                  </Stack>
                );
              })}
            </Stack>
          </Box>

          {error && (
            <Typography color="error" variant="body2" sx={{ px: 2, pb: 1 }}>
              {error}
            </Typography>
          )}

          <Divider />
          <Box component="form" onSubmit={onSubmit} sx={{ p: 1.5 }}>
            <Stack direction="row" spacing={1} sx={{ maxWidth: 960, mx: 'auto' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isStreaming || isLoadingSession}
              />
              <Button type="submit" variant="contained" disabled={isStreaming || isLoadingSession || !input.trim()}>
                {isStreaming ? 'Streaming...' : 'Send'}
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}

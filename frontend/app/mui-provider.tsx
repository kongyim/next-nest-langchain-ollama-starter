'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { CssBaseline, PaletteMode, ThemeProvider, createTheme } from '@mui/material';

type ColorModeContextValue = {
  mode: PaletteMode;
  toggleColorMode: () => void;
  setColorMode: (nextMode: PaletteMode) => void;
};

const STORAGE_KEY = 'mui-color-mode';

const ColorModeContext = createContext<ColorModeContextValue>({
  mode: 'light',
  toggleColorMode: () => undefined,
  setColorMode: () => undefined,
});

export function useColorMode() {
  return useContext(ColorModeContext);
}

export function MuiProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>('light');
  const [isModeReady, setIsModeReady] = useState(false);

  useEffect(() => {
    const savedMode = window.localStorage.getItem(STORAGE_KEY);
    if (savedMode === 'light' || savedMode === 'dark') {
      setMode(savedMode);
      setIsModeReady(true);
      return;
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      setMode('dark');
    }
    setIsModeReady(true);
  }, []);

  useEffect(() => {
    if (!isModeReady) return;
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [isModeReady, mode]);

  const colorMode = useMemo(
    () => ({
      mode,
      toggleColorMode: () => setMode((prev) => (prev === 'light' ? 'dark' : 'light')),
      setColorMode: (nextMode: PaletteMode) => setMode(nextMode),
    }),
    [mode],
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: mode === 'dark' ? '#60a5fa' : '#0f172a',
          },
          background: {
            default: mode === 'dark' ? '#0b1220' : '#f3f4f6',
            paper: mode === 'dark' ? '#111827' : '#ffffff',
          },
        },
        shape: {
          borderRadius: 10,
        },
        typography: {
          fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
        },
      }),
    [mode],
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, GlobalStyles, ThemeProvider } from '@mui/material';
import '@fontsource-variable/inter-tight';
import '@fontsource-variable/jetbrains-mono';
import { store } from './app/store';
import { theme } from './theme/theme';
import { brand } from './theme/palette';
import { NotifierProvider } from './components/common/Notifier';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: false, retry: 1 } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <GlobalStyles
            styles={{
              '@keyframes evPulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.35 } },
              '@keyframes evFloat': {
                '0%, 100%': { transform: 'translateY(0) rotate(var(--r))' },
                '50%': { transform: 'translateY(-10px) rotate(var(--r))' },
              },
              '@media (prefers-reduced-motion: reduce)': { '*': { animation: 'none !important', transition: 'none !important' } },
              '.mono': { fontFamily: '"JetBrains Mono Variable", monospace' },
              ':focus-visible': { outline: `2px solid ${brand.teal}`, outlineOffset: 2 },
              '::selection': { background: brand.teal, color: brand.navy },
            }}
          />
          <NotifierProvider>
            <App />
          </NotifierProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  </StrictMode>,
);

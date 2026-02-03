import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

const defaultOptions = {
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: (failureCount: number, error: unknown) => {
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 403) return false;
        if (status === 429) return failureCount < 2;
        return failureCount < 3;
      },
    },
  },
};

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient(defaultOptions));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

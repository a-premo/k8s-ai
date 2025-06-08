import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Optimized QueryClient configuration for K8s data
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time - how long data is considered fresh (K8s data changes frequently)
      staleTime: 30 * 1000, // 30 seconds
      // Cache time - how long to keep unused data in cache
      cacheTime: 5 * 60 * 1000, // 5 minutes
      // Retry failed requests
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Background refetch on window focus (useful for K8s monitoring)
      refetchOnWindowFocus: true,
      // Background refetch on network reconnect
      refetchOnReconnect: true,
      // Refetch interval for real-time data (optional, can be overridden per query)
      refetchInterval: false, // We'll use WebSockets for real-time updates
      // Keep previous data while fetching new data (smooth UX)
      keepPreviousData: true,
    },
    mutations: {
      // Retry mutations on failure
      retry: 1,
      // Use optimistic updates where possible
      onMutate: async () => {
        // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries();
      },
    },
  },
});

export const QueryProvider = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

export { queryClient }; 
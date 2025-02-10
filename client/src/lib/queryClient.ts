import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!res.ok) {
          if (res.status === 401) {
            // For authentication errors, we want to handle them gracefully
            return null;
          }

          if (res.status >= 500) {
            throw new Error(`Server error: ${res.status} ${res.statusText}`);
          }

          const errorText = await res.text();
          throw new Error(errorText || `Request failed with status ${res.status}`);
        }

        return res.json();
      },
      retry: (failureCount, error) => {
        // Don't retry on 401 unauthorized
        if (error instanceof Error && error.message.includes('401')) {
          return false;
        }
        // Retry other errors up to 2 times
        return failureCount < 2;
      },
      refetchOnWindowFocus: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: false,
    }
  },
});
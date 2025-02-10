import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InsertUser, SelectUser } from "@db/schema";

type RequestResult<T = void> = {
  ok: true;
  user?: { id: number; username: string };
  message?: string;
  data?: T;
} | {
  ok: false;
  message: string;
};

async function handleRequest<T = void>(
  url: string,
  method: string,
  body?: InsertUser
): Promise<RequestResult<T>> {
  try {
    const response = await fetch(url, {
      method,
      credentials: 'include',
      headers: {
        ...(body && { 'Content-Type': 'application/json' }),
        'Accept': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { 
        ok: false, 
        message: response.status >= 500 ? response.statusText : errorText
      };
    }

    const data = await response.json();
    return { ok: true, ...data };
  } catch (e: any) {
    console.error('Auth request failed:', e);
    return { 
      ok: false, 
      message: e instanceof Error ? e.message : 'Failed to process request' 
    };
  }
}

async function fetchUser(): Promise<SelectUser | null> {
  try {
    const response = await fetch('/api/user', {
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        return null;
      }
      throw new Error(await response.text());
    }

    return response.json();
  } catch (e) {
    console.error('Failed to fetch user:', e);
    throw e;
  }
}

export function useUser() {
  const queryClient = useQueryClient();

  const { data: user, error, isLoading } = useQuery<SelectUser | null, Error>({
    queryKey: ['user'],
    queryFn: fetchUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
    refetchOnWindowFocus: true
  });

  const loginMutation = useMutation<RequestResult<{ user: SelectUser }>, Error, InsertUser>({
    mutationFn: (userData) => handleRequest('/api/login', 'POST', userData),
    onSuccess: (data) => {
      if (data.ok) {
        queryClient.setQueryData(['user'], data.user);
        queryClient.invalidateQueries({ queryKey: ['user'] });
      }
    },
  });

  const logoutMutation = useMutation<RequestResult<void>, Error, void>({
    mutationFn: () => handleRequest('/api/logout', 'POST'),
    onSuccess: (data) => {
      if (data.ok) {
        queryClient.setQueryData(['user'], null);
        queryClient.invalidateQueries({ queryKey: ['user'] });
      }
    },
  });

  const registerMutation = useMutation<RequestResult<{ user: SelectUser }>, Error, InsertUser>({
    mutationFn: (userData) => handleRequest('/api/register', 'POST', userData),
    onSuccess: (data) => {
      if (data.ok) {
        queryClient.setQueryData(['user'], data.user);
        queryClient.invalidateQueries({ queryKey: ['user'] });
      }
    },
  });

  return {
    user,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
  };
}

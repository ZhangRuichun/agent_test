import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import HomePage from '../pages/home-page';

// Create a new QueryClient for tests
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Wrap component with necessary providers
const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('Home Page', () => {
  beforeAll(() => {
    // Mock fetch for authentication
    global.fetch = vi.fn().mockImplementation((url: string) => {
      // Mock user data endpoint
      if (url === '/api/user') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 1,
            username: "admin@example.com"
          })
        });
      }

      // Mock login endpoint
      if (url === '/api/auth/login') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            message: "Login successful",
            user: { 
              id: 1,
              username: "admin@example.com"
            }
          })
        });
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  it('shows welcome message after login', async () => {
    renderWithProviders(<HomePage />);

    // Wait for the welcome message to appear
    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeDefined();
      expect(heading.textContent).toBe('Hello, admin@example.com!');
    });
  });
});
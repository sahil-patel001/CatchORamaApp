import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import { AuthProvider } from '../contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock components for testing
const ThrowingComponent = () => {
  throw new Error('Test error');
};

const WorkingComponent = () => <div>Working component</div>;

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

describe('Frontend Performance Optimizations', () => {
  describe('Error Boundary', () => {
    it('should catch and display errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <ErrorBoundary level="component">
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/try again/i)).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary level="component">
          <WorkingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Working component')).toBeInTheDocument();
    });

    it('should provide different UI based on error level', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <ErrorBoundary level="critical">
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/critical error/i)).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('AuthContext Optimizations', () => {
    it('should provide stable function references', () => {
      const queryClient = createTestQueryClient();
      let authContextValue: any;

      const TestComponent = () => {
        const auth = React.useContext(require('../contexts/AuthContext').AuthContext);
        authContextValue = auth;
        return <div>Test</div>;
      };

      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </QueryClientProvider>
      );

      const firstLogin = authContextValue?.login;
      const firstLogout = authContextValue?.logout;

      // Re-render to check if functions maintain identity
      rerender(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </QueryClientProvider>
      );

      // Functions should maintain identity due to useCallback
      expect(authContextValue?.login).toBe(firstLogin);
      expect(authContextValue?.logout).toBe(firstLogout);
    });
  });

  describe('Component Memoization', () => {
    it('should prevent unnecessary re-renders with React.memo', () => {
      let renderCount = 0;

      const MemoizedComponent = React.memo(() => {
        renderCount++;
        return <div>Memoized Component</div>;
      });

      const ParentComponent = ({ value }: { value: number }) => (
        <div>
          <div>Parent value: {value}</div>
          <MemoizedComponent />
        </div>
      );

      const { rerender } = render(<ParentComponent value={1} />);
      expect(renderCount).toBe(1);

      // Re-render parent with same props for memoized component
      rerender(<ParentComponent value={2} />);
      
      // Memoized component should not re-render since its props didn't change
      expect(renderCount).toBe(1);
    });
  });

  describe('useMemo Optimizations', () => {
    it('should cache expensive calculations', () => {
      let calculationCount = 0;

      const ComponentWithMemo = ({ data }: { data: number[] }) => {
        const expensiveValue = React.useMemo(() => {
          calculationCount++;
          return data.reduce((sum, num) => sum + num, 0);
        }, [data]);

        return <div>Sum: {expensiveValue}</div>;
      };

      const { rerender } = render(<ComponentWithMemo data={[1, 2, 3]} />);
      expect(calculationCount).toBe(1);

      // Re-render with same data
      rerender(<ComponentWithMemo data={[1, 2, 3]} />);
      
      // Calculation should not run again due to useMemo
      expect(calculationCount).toBe(1);

      // Re-render with different data
      rerender(<ComponentWithMemo data={[4, 5, 6]} />);
      
      // Now calculation should run again
      expect(calculationCount).toBe(2);
    });
  });

  describe('useCallback Optimizations', () => {
    it('should maintain function identity across renders', () => {
      const callbacks: Array<() => void> = [];

      const ComponentWithCallback = ({ value }: { value: number }) => {
        const handleClick = React.useCallback(() => {
          console.log('Clicked');
        }, []); // No dependencies

        callbacks.push(handleClick);

        return <button onClick={handleClick}>Click me</button>;
      };

      const { rerender } = render(<ComponentWithCallback value={1} />);
      rerender(<ComponentWithCallback value={2} />);

      // Function should maintain identity due to useCallback
      expect(callbacks[0]).toBe(callbacks[1]);
    });
  });

  describe('Performance Validation', () => {
    it('should not break existing functionality', () => {
      // Test that basic rendering still works
      render(
        <ErrorBoundary level="component">
          <div>
            <h1>Test Application</h1>
            <p>Performance optimizations should not break functionality</p>
          </div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Test Application')).toBeInTheDocument();
      expect(screen.getByText(/performance optimizations/i)).toBeInTheDocument();
    });

    it('should handle nested error boundaries', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ErrorBoundary level="page">
          <div>
            <h1>Page Level</h1>
            <ErrorBoundary level="component">
              <ThrowingComponent />
            </ErrorBoundary>
          </div>
        </ErrorBoundary>
      );

      // Component level error boundary should catch the error
      expect(screen.getByText('Page Level')).toBeInTheDocument();
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });
});

// Performance benchmark test (optional, for development)
describe('Performance Benchmarks', () => {
  it('should render components efficiently', () => {
    const startTime = performance.now();

    // Render multiple components to test performance
    for (let i = 0; i < 100; i++) {
      render(
        <ErrorBoundary level="component">
          <div key={i}>Component {i}</div>
        </ErrorBoundary>
      );
    }

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // This is a basic performance check - adjust threshold as needed
    expect(renderTime).toBeLessThan(1000); // Should render 100 components in less than 1 second
  });
});

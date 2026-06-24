import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

const ThrowError = () => {
  throw new Error('Test Error');
};

describe('ErrorBoundary', () => {
  it('renders children if no error', () => {
    const { getByText } = render(<ErrorBoundary><div>Safe Content</div></ErrorBoundary>);
    expect(getByText('Safe Content')).toBeDefined();
  });

  it('renders error UI on crash', () => {
    // Suppress console.error for expected test error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(getByText('Rendering Error Detected')).toBeDefined();
    
    spy.mockRestore();
  });
});


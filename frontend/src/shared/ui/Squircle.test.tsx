import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Squircle } from './Squircle';

// Mock ResizeObserver
const mockResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}));

vi.stubGlobal('ResizeObserver', mockResizeObserver);

describe('Squircle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children correctly', () => {
    render(
      <Squircle>
        <div data-testid="child">Test content</div>
      </Squircle>
    );
    
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('applies default div element when no "as" prop is provided', () => {
    render(
      <Squircle data-testid="squircle">
        <span>Content</span>
      </Squircle>
    );
    
    const element = screen.getByTestId('squircle');
    expect(element.tagName).toBe('DIV');
  });

  it('renders with custom element type when "as" prop is provided', () => {
    render(
      <Squircle as="section" data-testid="squircle">
        <span>Content</span>
      </Squircle>
    );
    
    const element = screen.getByTestId('squircle');
    expect(element.tagName).toBe('SECTION');
  });

  it('applies custom className', () => {
    render(
      <Squircle className="custom-class" data-testid="squircle">
        Content
      </Squircle>
    );
    
    const element = screen.getByTestId('squircle');
    expect(element).toHaveClass('custom-class');
  });

  it('applies fallback border-radius style initially', () => {
    render(
      <Squircle radius={30} data-testid="squircle">
        Content
      </Squircle>
    );
    
    const element = screen.getByTestId('squircle');
    expect(element).toHaveStyle('border-radius: 30px');
  });

  it('passes through additional props', () => {
    render(
      <Squircle 
        data-testid="squircle"
        id="test-id"
        aria-label="Test squircle"
      >
        Content
      </Squircle>
    );
    
    const element = screen.getByTestId('squircle');
    expect(element).toHaveAttribute('id', 'test-id');
    expect(element).toHaveAttribute('aria-label', 'Test squircle');
  });

  it('uses default radius and smoothing values', () => {
    render(
      <Squircle data-testid="squircle">
        Content
      </Squircle>
    );
    
    const element = screen.getByTestId('squircle');
    // Should have fallback border-radius of 20px (default radius)
    expect(element).toHaveStyle('border-radius: 20px');
  });

  it('applies custom inline styles', () => {
    render(
      <Squircle 
        style={{ backgroundColor: 'red', padding: '10px' }}
        data-testid="squircle"
      >
        Content
      </Squircle>
    );
    
    const element = screen.getByTestId('squircle');
    expect(element).toHaveStyle('background-color: rgb(255, 0, 0)');
    expect(element).toHaveStyle('padding: 10px');
  });

  it('handles SSR environment safely', () => {
    // This test just verifies the component renders without throwing
    // The SSR safety is handled internally by checking typeof window
    expect(() => {
      render(
        <Squircle data-testid="squircle">
          Content
        </Squircle>
      );
    }).not.toThrow();
    
    const element = screen.getByTestId('squircle');
    expect(element).toBeInTheDocument();
  });
});
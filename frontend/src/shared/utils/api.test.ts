import { describe, it, expect, vi } from 'vitest';
import { apiFetch } from './api';

vi.mock('./waitForAuthReady', () => ({
  waitForAuthReady: vi.fn().mockResolvedValue('test-token'),
}));

vi.mock('./securityUtils', () => ({
  csrfProtection: { addToHeaders: vi.fn().mockReturnValue({}) },
  rateLimiter: { isAllowed: vi.fn().mockReturnValue(true) },
  logSecurityEvent: vi.fn(),
}));

describe('apiFetch', () => {
  it('returns primitive JSON values without replacing them with empty objects', async () => {
    const url = 'https://example.com/data';
    global.fetch = vi.fn().mockResolvedValue(
      new Response('"hello"', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const data = await apiFetch<string>(url);
    expect(data).toBe('hello');
  });

  it('returns null when server responds with JSON null', async () => {
    const url = 'https://example.com/null';
    global.fetch = vi.fn().mockResolvedValue(
      new Response('null', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const data = await apiFetch<null>(url);
    expect(data).toBeNull();
  });
});
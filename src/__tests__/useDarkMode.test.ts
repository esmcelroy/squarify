import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDarkMode } from '../hooks/useDarkMode';

function createMatchMedia(matches: boolean) {
  const listeners: Array<(e: { matches: boolean }) => void> = [];
  const mql = {
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: vi.fn((_event: string, handler: (e: { matches: boolean }) => void) => {
      listeners.push(handler);
    }),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;
  return { mql, listeners };
}

describe('useDarkMode', () => {
  let mockListeners: Array<(e: { matches: boolean }) => void>;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    mockListeners = [];

    window.matchMedia = vi.fn((query: string) => {
      const { mql, listeners } = createMatchMedia(false);
      mql.media = query;
      mockListeners.push(...listeners);
      // Keep reference so listeners added later are captured
      const origAddEventListener = mql.addEventListener as ReturnType<typeof vi.fn>;
      (mql as unknown as Record<string, unknown>).addEventListener = vi.fn((_event: string, handler: (e: { matches: boolean }) => void) => {
        mockListeners.push(handler);
        origAddEventListener(_event, handler);
      });
      return mql;
    }) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('defaults to system theme', () => {
    const { result } = renderHook(() => useDarkMode());
    expect(result.current[0]).toBe('system');
  });

  it('sets dark class when theme is dark', () => {
    const { result } = renderHook(() => useDarkMode());
    act(() => {
      result.current[1]('dark');
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('removes dark class when theme is light', () => {
    document.documentElement.classList.add('dark');
    const { result } = renderHook(() => useDarkMode());
    act(() => {
      result.current[1]('light');
    });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('registers listener for system matchMedia changes in system mode', () => {
    const { result } = renderHook(() => useDarkMode());
    expect(result.current[0]).toBe('system');
    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    expect(mockListeners.length).toBeGreaterThan(0);
  });

  it('persists theme to localStorage', () => {
    const { result } = renderHook(() => useDarkMode());
    act(() => {
      result.current[1]('dark');
    });
    const stored = localStorage.getItem('squarify-theme');
    expect(stored).toBe(JSON.stringify('dark'));
  });

  it('reads persisted theme from localStorage', () => {
    localStorage.setItem('squarify-theme', JSON.stringify('dark'));
    const { result } = renderHook(() => useDarkMode());
    expect(result.current[0]).toBe('dark');
    expect(result.current[2]).toBe(true); // isDark
  });

  it('isDark is false for light theme', () => {
    const { result } = renderHook(() => useDarkMode());
    act(() => {
      result.current[1]('light');
    });
    expect(result.current[2]).toBe(false);
  });

  it('isDark reflects system preference when theme is system', () => {
    // Override matchMedia to return matches=true
    window.matchMedia = vi.fn(() => {
      const { mql } = createMatchMedia(true);
      return mql;
    }) as unknown as typeof window.matchMedia;
    const { result } = renderHook(() => useDarkMode());
    expect(result.current[0]).toBe('system');
    expect(result.current[2]).toBe(true);
  });
});

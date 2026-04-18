import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock dependencies before importing App
vi.mock('../lib/imageUtils', () => ({
  getImageDimensions: vi.fn().mockResolvedValue({ width: 100, height: 100 }),
  findMaxAspectRatio: vi.fn().mockReturnValue(1),
  padImageToAspectRatio: vi.fn().mockResolvedValue('data:image/png;base64,mock'),
}));

vi.mock('../lib/heicUtils', () => ({
  processFilesForHeic: vi.fn().mockResolvedValue({ converted: [], errors: [] }),
}));

vi.mock('jszip', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      file: vi.fn(),
      generateAsync: vi.fn().mockResolvedValue(new Blob()),
    })),
  };
});

import App from '../App';

describe('App', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    window.matchMedia = vi.fn(() => ({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as any;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('renders with header "Squarify"', () => {
    render(<App />);
    expect(screen.getByText('Squarify')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<App />);
    expect(screen.getByText('Pad photos to a uniform aspect ratio')).toBeInTheDocument();
  });

  it('renders upload zone', () => {
    render(<App />);
    expect(screen.getByText(/drop photos here|click to browse/i)).toBeInTheDocument();
  });

  it('renders settings panel with Process button', () => {
    render(<App />);
    expect(screen.getByText('Process Images')).toBeInTheDocument();
  });

  it('renders theme toggle buttons', () => {
    render(<App />);
    expect(screen.getByTitle('Light')).toBeInTheDocument();
    expect(screen.getByTitle('Dark')).toBeInTheDocument();
    expect(screen.getByTitle('System')).toBeInTheDocument();
  });

  it('process button is disabled when no photos', () => {
    render(<App />);
    const processButton = screen.getByText('Process Images').closest('button');
    expect(processButton).toBeDisabled();
  });

  it('does not show clear all button when no photos', () => {
    render(<App />);
    expect(screen.queryByText('Clear all')).not.toBeInTheDocument();
  });
});

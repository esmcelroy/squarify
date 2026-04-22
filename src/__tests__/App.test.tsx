import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
    expect(screen.getByRole('heading', { name: 'Squarify' })).toBeInTheDocument();
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

  // --- Theme toggle ---
  it('clicking Dark theme button adds dark class to document', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTitle('Dark'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('clicking Light theme button removes dark class', async () => {
    const user = userEvent.setup();
    document.documentElement.classList.add('dark');
    render(<App />);

    await user.click(screen.getByTitle('Light'));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  // Helper to set up FileReader mock and upload mocks
  function setupUploadMocks() {
    const origFileReader = global.FileReader;

    class MockFileReader {
      result: string | null = 'data:image/png;base64,abc';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    global.FileReader = MockFileReader as any;

    return {
      restore: () => { global.FileReader = origFileReader; },
    };
  }

  async function setupMocksAndUpload() {
    const { processFilesForHeic } = await import('../lib/heicUtils');
    const { getImageDimensions } = await import('../lib/imageUtils');

    const mockFile = new File(['pixel'], 'test.png', { type: 'image/png' });
    (processFilesForHeic as ReturnType<typeof vi.fn>).mockResolvedValue({
      converted: [mockFile],
      errors: [],
    });
    (getImageDimensions as ReturnType<typeof vi.fn>).mockResolvedValue({ width: 200, height: 100 });

    return mockFile;
  }

  // --- Photo upload and stats bar ---
  it('shows stats bar and clear all after uploading photos', async () => {
    const mockFile = await setupMocksAndUpload();
    const { restore } = setupUploadMocks();

    render(<App />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(screen.getByText(/1 photo/)).toBeInTheDocument();
    });
    expect(screen.getByText('Clear all')).toBeInTheDocument();

    restore();
  });

  // --- Clear all ---
  it('clicking Clear all removes all photos', async () => {
    const user = userEvent.setup();
    const mockFile = await setupMocksAndUpload();
    const { restore } = setupUploadMocks();

    render(<App />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(screen.getByText(/1 photo/)).toBeInTheDocument();
    });

    await user.click(screen.getByText('Clear all'));
    expect(screen.queryByText(/1 photo/)).not.toBeInTheDocument();
    expect(screen.queryByText('Clear all')).not.toBeInTheDocument();

    restore();
  });

  // --- Process flow ---
  it('processing photos shows Download All button after completion', async () => {
    const user = userEvent.setup();
    const mockFile = await setupMocksAndUpload();
    const { padImageToAspectRatio } = await import('../lib/imageUtils');
    (padImageToAspectRatio as ReturnType<typeof vi.fn>).mockResolvedValue('data:image/png;base64,padded');
    const { restore } = setupUploadMocks();

    render(<App />);

    // Upload a photo
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(screen.getByText(/1 photo/)).toBeInTheDocument();
    });

    // Process
    const processButton = screen.getByText('Process Images').closest('button')!;
    expect(processButton).not.toBeDisabled();
    await user.click(processButton);

    await waitFor(() => {
      expect(screen.getByText('Download All as ZIP')).toBeInTheDocument();
    });

    restore();
  });

  // --- Auto-process on settings change ---
  it('does not show "Settings changed" warning (auto-process replaces it)', async () => {
    const user = userEvent.setup();
    const mockFile = await setupMocksAndUpload();
    const { padImageToAspectRatio } = await import('../lib/imageUtils');
    (padImageToAspectRatio as ReturnType<typeof vi.fn>).mockResolvedValue('data:image/png;base64,padded');
    const { restore } = setupUploadMocks();

    render(<App />);

    // Upload and process
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [mockFile] } });
    await waitFor(() => expect(screen.getByText(/1 photo/)).toBeInTheDocument());
    await user.click(screen.getByText('Process Images').closest('button')!);
    await waitFor(() => expect(screen.getByText('Download All as ZIP')).toBeInTheDocument());

    // Change a setting – the old warning must never appear
    const resetButton = screen.getByTitle('Reset to defaults');
    await user.click(resetButton);
    expect(screen.queryByText(/re-process to apply/i)).not.toBeInTheDocument();

    restore();
  });

  it('auto-processes after a settings change when photos are loaded', async () => {
    const user = userEvent.setup();
    const mockFile = await setupMocksAndUpload();
    const { padImageToAspectRatio } = await import('../lib/imageUtils');
    (padImageToAspectRatio as ReturnType<typeof vi.fn>).mockResolvedValue('data:image/png;base64,padded');
    const { restore } = setupUploadMocks();

    render(<App />);

    // Upload and do the initial manual process
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [mockFile] } });
    await waitFor(() => expect(screen.getByText(/1 photo/)).toBeInTheDocument());
    await user.click(screen.getByText('Process Images').closest('button')!);
    await waitFor(() => expect(screen.getByText('Download All as ZIP')).toBeInTheDocument());

    // Simulate a settings change by switching the output format (JPEG ≠ default PNG)
    await user.click(screen.getByRole('button', { name: 'jpeg' }));

    // Download All disappears immediately (isProcessed reset to false)
    expect(screen.queryByText('Download All as ZIP')).not.toBeInTheDocument();

    // After the debounce fires, auto-process re-runs and Download All reappears
    await waitFor(
      () => expect(screen.getByText('Download All as ZIP')).toBeInTheDocument(),
      { timeout: 3000 },
    );

    restore();
  }, 5000);
});

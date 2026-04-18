import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaddingSettingsPanel } from '../components/PaddingSettingsPanel';
import type { PaddingSettings } from '../types';

const defaultSettings: PaddingSettings = {
  fillType: 'color',
  fillColor: '#ffffff',
  fillImageDataUrl: null,
  fillImageStyle: 'cover',
  aspectRatio: 'auto',
  borderPadding: 0,
};

function renderPanel(overrides: Partial<Parameters<typeof PaddingSettingsPanel>[0]> = {}) {
  const props = {
    settings: defaultSettings,
    onChange: vi.fn(),
    onProcess: vi.fn(),
    isProcessing: false,
    hasPhotos: true,
    ...overrides,
  };
  const result = render(<PaddingSettingsPanel {...props} />);
  return { ...result, ...props };
}

describe('PaddingSettingsPanel', () => {
  it('renders with default settings (Solid Color selected)', () => {
    renderPanel();
    expect(screen.getByText('Solid Color')).toBeInTheDocument();
    expect(screen.getByText('Background Image')).toBeInTheDocument();
    expect(screen.getByText('Color')).toBeInTheDocument();
  });

  it('switches to Background Image fill type', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();

    await user.click(screen.getByText('Background Image'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ fillType: 'image' }));
  });

  it('switches to Solid Color fill type', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel({
      settings: { ...defaultSettings, fillType: 'image' },
    });

    await user.click(screen.getByText('Solid Color'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ fillType: 'color' }));
  });

  it('shows color picker when fillType is color', () => {
    renderPanel();
    expect(screen.getByText('Color')).toBeInTheDocument();
    const colorInput = document.querySelector('input[type="color"]');
    expect(colorInput).toBeInTheDocument();
  });

  it('shows image upload when fillType is image', () => {
    renderPanel({
      settings: { ...defaultSettings, fillType: 'image' },
    });
    expect(screen.getByText('Upload image')).toBeInTheDocument();
    expect(screen.getByText('Image')).toBeInTheDocument();
  });

  it('process button is disabled when hasPhotos is false', () => {
    renderPanel({ hasPhotos: false });
    const btn = screen.getByRole('button', { name: /process images/i });
    expect(btn).toBeDisabled();
  });

  it('process button shows spinner when isProcessing is true', () => {
    renderPanel({ isProcessing: true });
    expect(screen.getByText('Processing…')).toBeInTheDocument();
  });

  it('calls onProcess when Process Images button is clicked', async () => {
    const user = userEvent.setup();
    const { onProcess } = renderPanel();

    await user.click(screen.getByRole('button', { name: /process images/i }));
    expect(onProcess).toHaveBeenCalledOnce();
  });
});

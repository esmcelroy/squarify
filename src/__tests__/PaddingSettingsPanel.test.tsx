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
  customRatioWidth: 4,
  customRatioHeight: 3,
  borderPadding: 0,
  outputFormat: 'png',
  outputQuality: 0.92,
  maxDimension: 0,
  gradientDirection: 'vertical',
  gradientColorStart: '#ffffff',
  gradientColorEnd: '#000000',
  blurAmount: 40,
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
  it('renders with default settings (Color fill selected)', () => {
    renderPanel();
    expect(screen.getByText('Padding Settings')).toBeInTheDocument();
    // Fill type buttons
    const colorBtn = screen.getAllByText('Color')[0];
    expect(colorBtn).toBeInTheDocument();
    expect(screen.getByText('Gradient')).toBeInTheDocument();
    expect(screen.getByText('Blur')).toBeInTheDocument();
  });

  it('switches to Image fill type', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();

    // The fill type buttons are in the grid - "Image" is the second one
    const fillButtons = screen.getAllByText('Image');
    await user.click(fillButtons[0]);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ fillType: 'image' }));
  });

  it('switches to Color fill type from image', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel({
      settings: { ...defaultSettings, fillType: 'image' },
    });

    const colorButtons = screen.getAllByText('Color');
    await user.click(colorButtons[0]);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ fillType: 'color' }));
  });

  it('shows color picker when fillType is color', () => {
    renderPanel();
    const colorInput = document.querySelector('input[type="color"]');
    expect(colorInput).toBeInTheDocument();
  });

  it('shows image upload when fillType is image', () => {
    renderPanel({
      settings: { ...defaultSettings, fillType: 'image' },
    });
    expect(screen.getByText('Upload image')).toBeInTheDocument();
  });

  it('shows gradient controls when fillType is gradient', () => {
    renderPanel({
      settings: { ...defaultSettings, fillType: 'gradient' },
    });
    expect(screen.getByText('Direction')).toBeInTheDocument();
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('End')).toBeInTheDocument();
  });

  it('shows blur controls when fillType is blur', () => {
    renderPanel({
      settings: { ...defaultSettings, fillType: 'blur' },
    });
    expect(screen.getByText('Blur Amount')).toBeInTheDocument();
  });

  it('shows output format selector', () => {
    renderPanel();
    expect(screen.getByText('png')).toBeInTheDocument();
    expect(screen.getByText('jpeg')).toBeInTheDocument();
    expect(screen.getByText('webp')).toBeInTheDocument();
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

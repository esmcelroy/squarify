import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  // --- Gradient direction buttons ---
  it('clicking gradient direction buttons calls onChange with correct gradientDirection', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel({
      settings: { ...defaultSettings, fillType: 'gradient' },
    });

    await user.click(screen.getByText('↔'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ gradientDirection: 'horizontal' }));

    onChange.mockClear();
    await user.click(screen.getByText('↕'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ gradientDirection: 'vertical' }));

    onChange.mockClear();
    await user.click(screen.getByText('↗'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ gradientDirection: 'diagonal' }));

    onChange.mockClear();
    await user.click(screen.getByText('◎'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ gradientDirection: 'radial' }));
  });

  // --- Gradient color pickers ---
  it('changing gradient start color calls onChange', () => {
    const { onChange } = renderPanel({
      settings: { ...defaultSettings, fillType: 'gradient' },
    });

    const startInput = screen.getByLabelText('Gradient start color');
    startInput.dispatchEvent(new Event('input', { bubbles: true }));
    // Use fireEvent since userEvent doesn't support color inputs well
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set;
    nativeInputValueSetter?.call(startInput, '#ff0000');
    startInput.dispatchEvent(new Event('change', { bubbles: true }));

    expect(onChange).toHaveBeenCalled();
  });

  it('changing gradient end color calls onChange', () => {
    const { onChange } = renderPanel({
      settings: { ...defaultSettings, fillType: 'gradient' },
    });

    const endInput = screen.getByLabelText('Gradient end color');
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set;
    nativeInputValueSetter?.call(endInput, '#00ff00');
    endInput.dispatchEvent(new Event('change', { bubbles: true }));

    expect(onChange).toHaveBeenCalled();
  });

  // --- Blur slider ---
  it('changing blur amount slider calls onChange with new blurAmount', () => {
    const { onChange } = renderPanel({
      settings: { ...defaultSettings, fillType: 'blur' },
    });

    const slider = screen.getByRole('slider', { name: 'Blur amount' });
    fireEvent.change(slider, { target: { value: '60' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ blurAmount: 60 }));
  });

  // --- Custom ratio inputs ---
  it('typing in custom ratio width calls onChange with customRatioWidth', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel({
      settings: { ...defaultSettings, aspectRatio: 'custom' },
    });

    const widthInput = screen.getByRole('spinbutton', { name: 'Custom ratio width' });
    await user.clear(widthInput);
    await user.type(widthInput, '16');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ customRatioWidth: expect.any(Number) }));
  });

  it('typing in custom ratio height calls onChange with customRatioHeight', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel({
      settings: { ...defaultSettings, aspectRatio: 'custom' },
    });

    const heightInput = screen.getByRole('spinbutton', { name: 'Custom ratio height' });
    await user.clear(heightInput);
    await user.type(heightInput, '9');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ customRatioHeight: expect.any(Number) }));
  });

  // --- Border padding slider ---
  it('changing border padding slider calls onChange with new borderPadding', () => {
    const { onChange } = renderPanel();

    const slider = screen.getByRole('slider', { name: 'Border padding' });
    fireEvent.change(slider, { target: { value: '50' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ borderPadding: 50 }));
  });

  // --- Output format buttons ---
  it('clicking jpeg output format button calls onChange with outputFormat jpeg', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();

    await user.click(screen.getByText('jpeg'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ outputFormat: 'jpeg' }));
  });

  it('clicking webp output format button calls onChange with outputFormat webp', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();

    await user.click(screen.getByText('webp'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ outputFormat: 'webp' }));
  });

  it('clicking png output format button calls onChange with outputFormat png', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel({
      settings: { ...defaultSettings, outputFormat: 'jpeg' },
    });

    await user.click(screen.getByText('png'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ outputFormat: 'png' }));
  });

  // --- Quality slider ---
  it('quality slider appears only when format is jpeg or webp', () => {
    const { rerender } = render(
      <PaddingSettingsPanel
        settings={{ ...defaultSettings, outputFormat: 'png' }}
        onChange={vi.fn()}
        onProcess={vi.fn()}
        isProcessing={false}
        hasPhotos={true}
      />
    );
    expect(screen.queryByRole('slider', { name: 'Output quality' })).not.toBeInTheDocument();

    rerender(
      <PaddingSettingsPanel
        settings={{ ...defaultSettings, outputFormat: 'jpeg' }}
        onChange={vi.fn()}
        onProcess={vi.fn()}
        isProcessing={false}
        hasPhotos={true}
      />
    );
    expect(screen.getByRole('slider', { name: 'Output quality' })).toBeInTheDocument();

    rerender(
      <PaddingSettingsPanel
        settings={{ ...defaultSettings, outputFormat: 'webp' }}
        onChange={vi.fn()}
        onProcess={vi.fn()}
        isProcessing={false}
        hasPhotos={true}
      />
    );
    expect(screen.getByRole('slider', { name: 'Output quality' })).toBeInTheDocument();
  });

  it('changing quality slider calls onChange with new outputQuality', () => {
    const onChange = vi.fn();
    render(
      <PaddingSettingsPanel
        settings={{ ...defaultSettings, outputFormat: 'jpeg' }}
        onChange={onChange}
        onProcess={vi.fn()}
        isProcessing={false}
        hasPhotos={true}
      />
    );

    const slider = screen.getByRole('slider', { name: 'Output quality' });
    fireEvent.change(slider, { target: { value: '0.8' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ outputQuality: 0.8 }));
  });

  // --- Max dimension slider ---
  it('changing max dimension slider calls onChange with new maxDimension', () => {
    const { onChange } = renderPanel();

    const slider = screen.getByRole('slider', { name: 'Max dimension' });
    fireEvent.change(slider, { target: { value: '2000' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ maxDimension: 2000 }));
  });

  // --- Aspect ratio preset buttons ---
  it('clicking 1:1 Square aspect ratio preset calls onChange', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();

    await user.click(screen.getByText('1:1 Square'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ aspectRatio: '1:1' }));
  });

  it('clicking 16:9 aspect ratio preset calls onChange', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();

    await user.click(screen.getByText('16:9'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ aspectRatio: '16:9' }));
  });

  it('clicking Custom aspect ratio preset calls onChange', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();

    await user.click(screen.getByText('Custom'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ aspectRatio: 'custom' }));
  });

  // --- Background image style buttons ---
  it('clicking cover/contain/tile style buttons calls onChange with fillImageStyle', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel({
      settings: { ...defaultSettings, fillType: 'image' },
    });

    await user.click(screen.getByText('contain'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ fillImageStyle: 'contain' }));

    onChange.mockClear();
    await user.click(screen.getByText('tile'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ fillImageStyle: 'tile' }));

    onChange.mockClear();
    await user.click(screen.getByText('cover'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ fillImageStyle: 'cover' }));
  });

  // --- Background image upload ---
  it('clicking Upload image button triggers file input', async () => {
    const user = userEvent.setup();
    renderPanel({
      settings: { ...defaultSettings, fillType: 'image' },
    });

    const fileInput = screen.getByLabelText('Upload background image') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');

    await user.click(screen.getByText('Upload image'));
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('shows "Change image" when fillImageDataUrl is set', () => {
    renderPanel({
      settings: { ...defaultSettings, fillType: 'image', fillImageDataUrl: 'data:image/png;base64,abc' },
    });
    expect(screen.getByText('Change image')).toBeInTheDocument();
    expect(screen.getByAltText('Background')).toBeInTheDocument();
  });
});

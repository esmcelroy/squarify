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
  watermark: { enabled: false, text: '', fontSize: 48, color: '#ffffff', opacity: 0.5, position: 'bottom-right' as const },
  shadow: { enabled: false, color: '#000000', blur: 20, offsetX: 0, offsetY: 4 },
  pattern: { type: 'dots' as const, color1: '#ffffff', color2: '#e5e7eb', scale: 2 },
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

  // --- 5 fill type buttons ---
  it('renders all 5 fill type buttons including Pattern', () => {
    renderPanel();
    expect(screen.getAllByText('Color')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Image')[0]).toBeInTheDocument();
    expect(screen.getByText('Gradient')).toBeInTheDocument();
    expect(screen.getByText('Blur')).toBeInTheDocument();
    expect(screen.getByText('Pattern')).toBeInTheDocument();
  });

  it('switches to Pattern fill type', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();
    await user.click(screen.getByText('Pattern'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ fillType: 'pattern' }));
  });

  // --- Pattern fill UI ---
  it('shows pattern type buttons when fillType is pattern', () => {
    renderPanel({
      settings: { ...defaultSettings, fillType: 'pattern' },
    });
    expect(screen.getByText('dots')).toBeInTheDocument();
    expect(screen.getByText('stripes')).toBeInTheDocument();
    expect(screen.getByText('checkerboard')).toBeInTheDocument();
    expect(screen.getByText('diagonal lines')).toBeInTheDocument();
  });

  it('clicking pattern type buttons calls onChange with updated pattern', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel({
      settings: { ...defaultSettings, fillType: 'pattern' },
    });

    await user.click(screen.getByText('stripes'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      pattern: expect.objectContaining({ type: 'stripes' }),
    }));

    onChange.mockClear();
    await user.click(screen.getByText('checkerboard'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      pattern: expect.objectContaining({ type: 'checkerboard' }),
    }));

    onChange.mockClear();
    await user.click(screen.getByText('diagonal lines'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      pattern: expect.objectContaining({ type: 'diagonal-lines' }),
    }));
  });

  it('shows pattern color pickers and changing them calls onChange', () => {
    const { onChange } = renderPanel({
      settings: { ...defaultSettings, fillType: 'pattern' },
    });

    const color1 = screen.getByLabelText('Pattern color 1');
    expect(color1).toBeInTheDocument();
    fireEvent.change(color1, { target: { value: '#ff0000' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      pattern: expect.objectContaining({ color1: '#ff0000' }),
    }));

    onChange.mockClear();
    const color2 = screen.getByLabelText('Pattern color 2');
    expect(color2).toBeInTheDocument();
    fireEvent.change(color2, { target: { value: '#00ff00' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      pattern: expect.objectContaining({ color2: '#00ff00' }),
    }));
  });

  it('shows pattern scale slider and changing it calls onChange', () => {
    const { onChange } = renderPanel({
      settings: { ...defaultSettings, fillType: 'pattern' },
    });

    const slider = screen.getByRole('slider', { name: 'Pattern scale' });
    expect(slider).toBeInTheDocument();
    fireEvent.change(slider, { target: { value: '5' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      pattern: expect.objectContaining({ scale: 5 }),
    }));
  });

  // --- Watermark section ---
  it('shows watermark toggle button', () => {
    renderPanel();
    expect(screen.getByText('Watermark')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Toggle watermark' })).toBeInTheDocument();
  });

  it('toggling watermark calls onChange with enabled true', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();
    await user.click(screen.getByRole('button', { name: 'Toggle watermark' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      watermark: expect.objectContaining({ enabled: true }),
    }));
  });

  it('shows watermark controls when enabled', () => {
    renderPanel({
      settings: {
        ...defaultSettings,
        watermark: { ...defaultSettings.watermark, enabled: true },
      },
    });
    expect(screen.getByLabelText('Watermark text')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Watermark font size' })).toBeInTheDocument();
    expect(screen.getByLabelText('Watermark color')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Watermark opacity' })).toBeInTheDocument();
  });

  it('does not show watermark controls when disabled', () => {
    renderPanel();
    expect(screen.queryByLabelText('Watermark text')).not.toBeInTheDocument();
    expect(screen.queryByRole('slider', { name: 'Watermark font size' })).not.toBeInTheDocument();
  });

  it('changing watermark text calls onChange', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel({
      settings: {
        ...defaultSettings,
        watermark: { ...defaultSettings.watermark, enabled: true },
      },
    });
    const input = screen.getByLabelText('Watermark text');
    await user.type(input, 'hello');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      watermark: expect.objectContaining({ text: expect.any(String) }),
    }));
  });

  it('changing watermark font size slider calls onChange', () => {
    const { onChange } = renderPanel({
      settings: {
        ...defaultSettings,
        watermark: { ...defaultSettings.watermark, enabled: true },
      },
    });
    const slider = screen.getByRole('slider', { name: 'Watermark font size' });
    fireEvent.change(slider, { target: { value: '72' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      watermark: expect.objectContaining({ fontSize: 72 }),
    }));
  });

  it('changing watermark opacity slider calls onChange', () => {
    const { onChange } = renderPanel({
      settings: {
        ...defaultSettings,
        watermark: { ...defaultSettings.watermark, enabled: true },
      },
    });
    const slider = screen.getByRole('slider', { name: 'Watermark opacity' });
    fireEvent.change(slider, { target: { value: '0.8' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      watermark: expect.objectContaining({ opacity: 0.8 }),
    }));
  });

  it('changing watermark color calls onChange', () => {
    const { onChange } = renderPanel({
      settings: {
        ...defaultSettings,
        watermark: { ...defaultSettings.watermark, enabled: true },
      },
    });
    const colorInput = screen.getByLabelText('Watermark color');
    fireEvent.change(colorInput, { target: { value: '#ff0000' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      watermark: expect.objectContaining({ color: '#ff0000' }),
    }));
  });

  it('shows 6 watermark position buttons and clicking one calls onChange', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel({
      settings: {
        ...defaultSettings,
        watermark: { ...defaultSettings.watermark, enabled: true },
      },
    });
    expect(screen.getByText('top left')).toBeInTheDocument();
    expect(screen.getByText('top center')).toBeInTheDocument();
    expect(screen.getByText('top right')).toBeInTheDocument();
    expect(screen.getByText('bottom left')).toBeInTheDocument();
    expect(screen.getByText('bottom center')).toBeInTheDocument();
    expect(screen.getByText('bottom right')).toBeInTheDocument();

    await user.click(screen.getByText('top left'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      watermark: expect.objectContaining({ position: 'top-left' }),
    }));
  });

  // --- Shadow section ---
  it('shows shadow toggle button', () => {
    renderPanel();
    expect(screen.getByText('Drop Shadow')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Toggle drop shadow' })).toBeInTheDocument();
  });

  it('toggling shadow calls onChange with enabled true', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();
    await user.click(screen.getByRole('button', { name: 'Toggle drop shadow' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      shadow: expect.objectContaining({ enabled: true }),
    }));
  });

  it('shows shadow controls when enabled', () => {
    renderPanel({
      settings: {
        ...defaultSettings,
        shadow: { ...defaultSettings.shadow, enabled: true },
      },
    });
    expect(screen.getByLabelText('Shadow color')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Shadow blur' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Shadow offset X' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Shadow offset Y' })).toBeInTheDocument();
  });

  it('does not show shadow controls when disabled', () => {
    renderPanel();
    expect(screen.queryByLabelText('Shadow color')).not.toBeInTheDocument();
    expect(screen.queryByRole('slider', { name: 'Shadow blur' })).not.toBeInTheDocument();
  });

  it('changing shadow color calls onChange', () => {
    const { onChange } = renderPanel({
      settings: {
        ...defaultSettings,
        shadow: { ...defaultSettings.shadow, enabled: true },
      },
    });
    fireEvent.change(screen.getByLabelText('Shadow color'), { target: { value: '#333333' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      shadow: expect.objectContaining({ color: '#333333' }),
    }));
  });

  it('changing shadow blur slider calls onChange', () => {
    const { onChange } = renderPanel({
      settings: {
        ...defaultSettings,
        shadow: { ...defaultSettings.shadow, enabled: true },
      },
    });
    fireEvent.change(screen.getByRole('slider', { name: 'Shadow blur' }), { target: { value: '30' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      shadow: expect.objectContaining({ blur: 30 }),
    }));
  });

  it('changing shadow offsetX slider calls onChange', () => {
    const { onChange } = renderPanel({
      settings: {
        ...defaultSettings,
        shadow: { ...defaultSettings.shadow, enabled: true },
      },
    });
    fireEvent.change(screen.getByRole('slider', { name: 'Shadow offset X' }), { target: { value: '10' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      shadow: expect.objectContaining({ offsetX: 10 }),
    }));
  });

  it('changing shadow offsetY slider calls onChange', () => {
    const { onChange } = renderPanel({
      settings: {
        ...defaultSettings,
        shadow: { ...defaultSettings.shadow, enabled: true },
      },
    });
    fireEvent.change(screen.getByRole('slider', { name: 'Shadow offset Y' }), { target: { value: '-5' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      shadow: expect.objectContaining({ offsetY: -5 }),
    }));
  });

  // --- Eyedropper button ---
  it('shows eyedropper button when EyeDropper API is available', () => {
    // Mock the EyeDropper API
    const origEyeDropper = (window as Record<string, unknown>).EyeDropper;
    (window as Record<string, unknown>).EyeDropper = class { open() { return Promise.resolve({ sRGBHex: '#000000' }); } };

    renderPanel({ settings: { ...defaultSettings, fillType: 'color' } });
    expect(screen.getByRole('button', { name: 'Pick color from screen' })).toBeInTheDocument();

    // Cleanup
    if (origEyeDropper) {
      (window as Record<string, unknown>).EyeDropper = origEyeDropper;
    } else {
      delete (window as Record<string, unknown>).EyeDropper;
    }
  });

  it('does not show eyedropper button when EyeDropper API is unavailable', () => {
    const origEyeDropper = (window as Record<string, unknown>).EyeDropper;
    delete (window as Record<string, unknown>).EyeDropper;

    renderPanel({ settings: { ...defaultSettings, fillType: 'color' } });
    expect(screen.queryByRole('button', { name: 'Pick color from screen' })).not.toBeInTheDocument();

    if (origEyeDropper) {
      (window as Record<string, unknown>).EyeDropper = origEyeDropper;
    }
  });

  // --- Social media presets ---
  it('shows social media preset buttons', () => {
    renderPanel();
    expect(screen.getByText('Social Media Presets')).toBeInTheDocument();
    expect(screen.getByText('IG Post')).toBeInTheDocument();
    expect(screen.getByText('IG Story')).toBeInTheDocument();
    expect(screen.getByText('Facebook')).toBeInTheDocument();
    expect(screen.getByText('X / Twitter')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
  });

  it('clicking IG Post sets custom ratio 1:1 and maxDimension 1080', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();
    await user.click(screen.getByText('IG Post'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      aspectRatio: 'custom',
      customRatioWidth: 1,
      customRatioHeight: 1,
      maxDimension: 1080,
    }));
  });

  it('clicking IG Story sets custom ratio 9:16 and maxDimension 1080', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();
    await user.click(screen.getByText('IG Story'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      aspectRatio: 'custom',
      customRatioWidth: 9,
      customRatioHeight: 16,
      maxDimension: 1080,
    }));
  });

  it('clicking Facebook sets custom ratio and maxDimension 1200', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();
    await user.click(screen.getByText('Facebook'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      aspectRatio: 'custom',
      customRatioWidth: 1200,
      customRatioHeight: 630,
      maxDimension: 1200,
    }));
  });

  it('clicking X / Twitter sets custom ratio 16:9 and maxDimension 1200', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();
    await user.click(screen.getByText('X / Twitter'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      aspectRatio: 'custom',
      customRatioWidth: 16,
      customRatioHeight: 9,
      maxDimension: 1200,
    }));
  });

  it('clicking LinkedIn sets custom ratio and maxDimension 1200', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();
    await user.click(screen.getByText('LinkedIn'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      aspectRatio: 'custom',
      customRatioWidth: 1200,
      customRatioHeight: 627,
      maxDimension: 1200,
    }));
  });

  it('clicking YouTube sets custom ratio 16:9 and maxDimension 1280', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();
    await user.click(screen.getByText('YouTube'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      aspectRatio: 'custom',
      customRatioWidth: 16,
      customRatioHeight: 9,
      maxDimension: 1280,
    }));
  });

  // --- Backward compatibility with missing settings ---
  it('handles settings without watermark/shadow/pattern using defaults', () => {
    const settingsWithoutNew = {
      ...defaultSettings,
      watermark: undefined,
      shadow: undefined,
      pattern: undefined,
    } as unknown as PaddingSettings;

    // Should render without errors
    renderPanel({ settings: settingsWithoutNew });
    expect(screen.getByText('Watermark')).toBeInTheDocument();
    expect(screen.getByText('Drop Shadow')).toBeInTheDocument();
  });
});

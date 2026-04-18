import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoUpload } from '../components/PhotoUpload';

function makeFile(name: string, type: string): File {
  return new File(['pixels'], name, { type });
}

describe('PhotoUpload', () => {
  it('renders upload zone with correct text', () => {
    render(<PhotoUpload onPhotosAdded={vi.fn()} currentCount={0} />);
    expect(screen.getByText('Drop photos here or click to browse')).toBeInTheDocument();
    expect(screen.getByText(/JPG, PNG, WebP, GIF/)).toBeInTheDocument();
  });

  it('shows correct count (e.g. "3/20 added")', () => {
    render(<PhotoUpload onPhotosAdded={vi.fn()} currentCount={3} />);
    expect(screen.getByText(/3\/20 added/)).toBeInTheDocument();
  });

  it('shows "Maximum photos reached" when at 20 photos', () => {
    render(<PhotoUpload onPhotosAdded={vi.fn()} currentCount={20} />);
    expect(screen.getByText('Maximum photos reached')).toBeInTheDocument();
  });

  it('calls onPhotosAdded when files are selected via input', async () => {
    const user = userEvent.setup();
    const onPhotosAdded = vi.fn();
    render(<PhotoUpload onPhotosAdded={onPhotosAdded} currentCount={0} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile('photo.png', 'image/png');
    await user.upload(input, file);

    expect(onPhotosAdded).toHaveBeenCalledWith([file]);
  });

  it('shows error for invalid file types', () => {
    const onPhotosAdded = vi.fn();
    render(<PhotoUpload onPhotosAdded={onPhotosAdded} currentCount={0} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const badFile = makeFile('doc.pdf', 'application/pdf');

    // fireEvent bypasses the accept attribute filtering that userEvent respects
    Object.defineProperty(input, 'files', { value: [badFile], configurable: true });
    fireEvent.change(input);

    expect(screen.getByText(/1 file\(s\) skipped/)).toBeInTheDocument();
    expect(onPhotosAdded).not.toHaveBeenCalled();
  });

  it('shows error when exceeding max photos', async () => {
    const user = userEvent.setup();
    const onPhotosAdded = vi.fn();
    render(<PhotoUpload onPhotosAdded={onPhotosAdded} currentCount={19} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [
      makeFile('a.png', 'image/png'),
      makeFile('b.png', 'image/png'),
    ];
    await user.upload(input, files);

    expect(screen.getByText(/Only 1 more photo\(s\) can be added/)).toBeInTheDocument();
    expect(onPhotosAdded).toHaveBeenCalledWith([files[0]]);
  });
});

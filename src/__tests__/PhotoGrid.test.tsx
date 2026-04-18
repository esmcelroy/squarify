import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PhotoGrid } from '../components/PhotoGrid';
import type { UploadedPhoto } from '../types';

function makePhoto(overrides: Partial<UploadedPhoto> = {}): UploadedPhoto {
  return {
    id: 'photo-1',
    file: new File(['px'], 'test.png', { type: 'image/png' }),
    dataUrl: 'data:image/png;base64,abc',
    width: 800,
    height: 600,
    aspectRatio: 800 / 600,
    paddedDataUrl: null,
    ...overrides,
  };
}

const defaultProps = {
  maxAspectRatio: 800 / 600,
  onRemove: vi.fn(),
  isProcessed: false,
  outputFormat: 'png',
};

describe('PhotoGrid', () => {
  it('returns null when photos array is empty', () => {
    const { container } = render(<PhotoGrid photos={[]} {...defaultProps} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders photo cards for each photo', () => {
    const photos = [
      makePhoto({ id: 'p1', file: new File([''], 'a.png', { type: 'image/png' }) }),
      makePhoto({ id: 'p2', file: new File([''], 'b.png', { type: 'image/png' }) }),
    ];
    render(<PhotoGrid photos={photos} {...defaultProps} />);
    expect(screen.getByText('a.png')).toBeInTheDocument();
    expect(screen.getByText('b.png')).toBeInTheDocument();
  });

  it('shows "Widest" badge on the photo with max aspect ratio', () => {
    const photos = [
      makePhoto({ id: 'p1', aspectRatio: 1.5 }),
      makePhoto({ id: 'p2', aspectRatio: 2.0 }),
    ];
    render(<PhotoGrid photos={photos} maxAspectRatio={2.0} onRemove={vi.fn()} isProcessed={false} outputFormat="png" />);
    expect(screen.getByText('Widest')).toBeInTheDocument();
  });

  it('shows download button only when isProcessed is true', () => {
    const photos = [
      makePhoto({ id: 'p1', paddedDataUrl: 'data:image/png;base64,padded' }),
    ];

    const { rerender } = render(
      <PhotoGrid photos={photos} maxAspectRatio={800 / 600} onRemove={vi.fn()} isProcessed={false} outputFormat="png" />
    );
    expect(screen.queryByTitle('Download')).not.toBeInTheDocument();

    rerender(
      <PhotoGrid photos={photos} maxAspectRatio={800 / 600} onRemove={vi.fn()} isProcessed={true} outputFormat="png" />
    );
    expect(screen.getByTitle('Download')).toBeInTheDocument();
  });
});

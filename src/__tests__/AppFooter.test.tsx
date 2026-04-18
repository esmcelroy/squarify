import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppFooter } from '../components/AppFooter';

describe('AppFooter', () => {
  it('renders footer text "Squarify"', () => {
    render(<AppFooter />);
    expect(screen.getByText('Squarify')).toBeInTheDocument();
  });

  it('renders GitHub link with correct href', () => {
    render(<AppFooter />);
    const link = screen.getByLabelText('View source on GitHub');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://github.com/esmcelroy/squarify');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows About button', () => {
    render(<AppFooter />);
    expect(screen.getByText('About')).toBeInTheDocument();
  });

  it('clicking About opens the dialog', () => {
    render(<AppFooter />);
    expect(screen.queryByText('About Squarify')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('About'));
    expect(screen.getByText('About Squarify')).toBeInTheDocument();
  });

  it('dialog shows privacy text', () => {
    render(<AppFooter />);
    fireEvent.click(screen.getByText('About'));
    expect(screen.getByText(/your photos never leave your device/)).toBeInTheDocument();
  });

  it('dialog can be closed with X button', () => {
    render(<AppFooter />);
    fireEvent.click(screen.getByText('About'));
    expect(screen.getByText('About Squarify')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Close about dialog'));
    expect(screen.queryByText('About Squarify')).not.toBeInTheDocument();
  });

  it('dialog shows how-to-use steps', () => {
    render(<AppFooter />);
    fireEvent.click(screen.getByText('About'));

    expect(screen.getByText('How to use')).toBeInTheDocument();
    expect(screen.getByText(/Upload photos/)).toBeInTheDocument();
    expect(screen.getByText(/Configure/)).toBeInTheDocument();
    expect(screen.getByText(/Process/i, { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText(/Export/i, { selector: 'strong' })).toBeInTheDocument();
  });
});

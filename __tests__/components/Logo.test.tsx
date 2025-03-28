import React from 'react';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import Logo from '@/app/components/Logo';

describe('Logo Component', () => {
  it('renders with default props', () => {
    render(<Logo />);

    // Check that the SVG is rendered
    const svgElement = document.querySelector('svg');
    expect(svgElement).toBeInTheDocument();

    // Check default size
    expect(svgElement).toHaveAttribute('width', '24');
    expect(svgElement).toHaveAttribute('height', '24');
  });

  it('applies custom size', () => {
    render(<Logo size={48} />);

    const svgElement = document.querySelector('svg');
    expect(svgElement).toHaveAttribute('width', '48');
    expect(svgElement).toHaveAttribute('height', '48');
  });

  it('applies custom className', () => {
    const customClass = 'test-class';
    render(<Logo className={customClass} />);

    const svgElement = document.querySelector('svg');
    expect(svgElement).toHaveClass(customClass);
  });
});

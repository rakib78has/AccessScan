import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/popup/App';

describe('SC-UI-001 popup shell', () => {
  it('shows the product name as the page heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'SiteCheck' })).toBeInTheDocument();
  });

  it('warns that automated checks cannot prove WCAG conformance', () => {
    render(<App />);
    expect(screen.getByTestId('automation-disclaimer')).toHaveTextContent(
      /does not mean a page meets WCAG/,
    );
  });
});

describe('SC-UI-002 popup accessibility', () => {
  it('has no axe violations in its rendered markup', async () => {
    const { container } = render(<App />);
    // jsdom has no layout engine, so colour contrast cannot be evaluated here;
    // it is covered by the real-browser tests instead.
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

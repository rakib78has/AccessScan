import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import { FindingsPanel } from '../../src/popup/components/FindingsPanel';
import { ErrorBoundary } from '../../src/popup/components/ErrorBoundary';
import type { ScanResult } from '../../src/shared/types/scan';
import { makeFinding, makeScanResult } from '../helpers/scan-data';

const result = makeScanResult({
  findings: [
    makeFinding({
      ruleId: 'image-alt',
      impact: 'critical',
      title: 'Images must have alternative text',
      nodeCount: 2,
      nodes: [
        { target: '#missing-alt', html: '<img id="missing-alt">', failureSummary: 'Add an alt' },
        { target: '#logo', html: '<img id="logo">', failureSummary: 'Add an alt' },
      ],
    }),
    makeFinding({ ruleId: 'region', impact: 'moderate', title: 'Content in landmarks' }),
    makeFinding({
      ruleId: 'color-contrast',
      outcome: 'needs-review',
      impact: 'serious',
      title: 'Elements must meet minimum contrast',
    }),
  ],
});

function renderPanel(scan: ScanResult = result, message: string | null = null) {
  const onHighlight = vi.fn();
  render(<FindingsPanel result={scan} onHighlight={onHighlight} highlightMessage={message} />);
  return { onHighlight, user: userEvent.setup() };
}

const findingTitles = () =>
  within(screen.getByRole('list', { name: 'Findings' }))
    .queryAllByRole('group')
    .map((d) => d.querySelector('summary')?.textContent ?? '');

describe('SC-UI-006 findings list and filters', () => {
  it('lists violations by default, most severe first', () => {
    renderPanel();
    expect(findingTitles()).toEqual([
      'CriticalImages must have alternative text2 elements',
      'ModerateContent in landmarks1 element',
    ]);
  });

  it('switches to items needing review and says they are unconfirmed', async () => {
    const { user } = renderPanel();
    await user.click(screen.getByRole('radio', { name: 'Needs review (1)' }));
    expect(findingTitles()).toEqual(['SeriousElements must meet minimum contrast1 element']);
    expect(screen.getByText(/they are not confirmed problems/)).toBeInTheDocument();
  });

  it('filters by severity, with counts on each option', async () => {
    const { user } = renderPanel();
    await user.click(screen.getByRole('checkbox', { name: 'Critical (1)' }));
    expect(findingTitles()).toEqual(['ModerateContent in landmarks1 element']);
    await user.click(screen.getByRole('checkbox', { name: 'Moderate (1)' }));
    expect(screen.getByTestId('findings-empty')).toHaveTextContent(
      'No findings match the selected filters.',
    );
  });

  it('only offers severities that have findings', () => {
    renderPanel();
    expect(screen.queryByRole('checkbox', { name: /Minor/ })).toBeNull();
  });

  it('filters by category, and keeps an unticked option available', async () => {
    const seoFinding = makeFinding({
      ruleId: 'seo-viewport-missing',
      source: 'seo',
      impact: 'moderate',
      title: 'Page has no viewport meta tag',
      nodeCount: 0,
      nodes: [],
    });
    const { user } = renderPanel(makeScanResult({ findings: [...result.findings, seoFinding] }));
    await user.click(screen.getByRole('checkbox', { name: 'Accessibility (2)' }));
    expect(findingTitles()).toEqual(['ModerateSEOPage has no viewport meta tagWhole page']);
    // Counts follow the other filters: only one moderate finding is now in view.
    expect(screen.getByRole('checkbox', { name: 'Moderate (1)' })).toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: 'Accessibility (2)' }));
    expect(findingTitles()).toHaveLength(3);
  });

  it('does not call a clean result proof of accessibility', () => {
    renderPanel(makeScanResult({ findings: [] }));
    expect(screen.getByTestId('findings-empty')).toHaveTextContent(
      'That is not proof the page is accessible.',
    );
  });
});

describe('SC-UI-010 page-wide findings', () => {
  it('explains the fix without listing elements or offering a highlight', async () => {
    const finding = makeFinding({
      ruleId: 'seo-meta-description-missing',
      source: 'seo',
      title: 'Page has no meta description',
      description: 'Add <meta name="description" content="…">.',
      wcagTags: [],
      nodeCount: 0,
      nodes: [],
    });
    const { user } = renderPanel(makeScanResult({ findings: [finding] }));
    await user.click(screen.getByText('Page has no meta description'));
    expect(screen.getByText('Add <meta name="description" content="…">.')).toBeInTheDocument();
    expect(screen.queryByText(/Affected/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Highlight/ })).toBeNull();
    expect(screen.queryByText(/WCAG/)).toBeNull();
  });
});

describe('SC-UI-007 finding details', () => {
  it('renders affected elements only once a finding is opened', async () => {
    const { user } = renderPanel();
    expect(screen.queryByText('#missing-alt')).toBeNull();
    await user.click(screen.getByText('Images must have alternative text'));
    expect(screen.getByText('#missing-alt')).toBeInTheDocument();
    expect(screen.getByText('#logo')).toBeInTheDocument();
  });

  it('shows WCAG criteria, the rule id and a safe link to the fix', async () => {
    const { user } = renderPanel();
    await user.click(screen.getByText('Images must have alternative text'));
    expect(screen.getByText(/WCAG success criteria: 1\.1\.1/)).toBeInTheDocument();
    expect(screen.getByText(/Level: WCAG 2\.0 A/)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'How to fix this (opens in a new tab)' });
    expect(link).toHaveAttribute('href', 'https://dequeuniversity.com/rules/axe/4.14/image-alt');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('omits the link when there is no safe help URL', async () => {
    const { user } = renderPanel(makeScanResult({ findings: [makeFinding({ helpUrl: null })] }));
    await user.click(screen.getByText('Images must have alternative text'));
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('says when only some affected elements are listed', async () => {
    const finding = makeFinding({ nodeCount: 120 });
    const { user } = renderPanel(makeScanResult({ findings: [finding] }));
    await user.click(screen.getByText('Images must have alternative text'));
    expect(screen.getByText('Showing 1 of 120 affected elements.')).toBeInTheDocument();
  });

  it('asks for the chosen element to be highlighted', async () => {
    const { user, onHighlight } = renderPanel();
    await user.click(screen.getByText('Images must have alternative text'));
    await user.click(screen.getByRole('button', { name: 'Highlight on page: #logo' }));
    expect(onHighlight).toHaveBeenCalledWith('#logo');
  });

  it('announces the outcome of a highlight', () => {
    renderPanel(result, 'Highlighted on the page.');
    expect(screen.getByRole('status', { name: 'Highlight status' })).toHaveTextContent(
      'Highlighted on the page.',
    );
  });

  // jsdom does not toggle <details> from the keyboard, so opening a finding with
  // Enter is covered in real Chromium by SC-E2E-010.
  it('operates the highlight button with the keyboard', async () => {
    const { user, onHighlight } = renderPanel();
    await user.click(screen.getByText('Images must have alternative text'));
    screen.getByRole('button', { name: 'Highlight on page: #missing-alt' }).focus();
    await user.keyboard('{Enter}');
    expect(onHighlight).toHaveBeenCalledWith('#missing-alt');
  });
});

describe('SC-SEC-001 untrusted page content', () => {
  it('shows page markup in snippets, selectors and summaries as inert text', async () => {
    const hostile = '<img src=x onerror="window.__pwned = true">';
    const finding = makeFinding({
      title: hostile,
      description: hostile,
      nodes: [{ target: hostile, html: hostile, failureSummary: hostile }],
    });
    const { user } = renderPanel(makeScanResult({ findings: [finding] }));
    await user.click(screen.getByText(hostile, { selector: 'summary span' }));

    expect(screen.getAllByText(hostile).length).toBeGreaterThanOrEqual(4);
    expect(document.querySelector('img')).toBeNull();
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined();
  });
});

describe('SC-UI-008 findings accessibility', () => {
  it('has no axe violations with a finding expanded', async () => {
    const { user } = renderPanel();
    await user.click(screen.getByText('Images must have alternative text'));
    const results = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

describe('SC-UI-009 error boundary', () => {
  function Broken(): never {
    throw new Error('render failure');
  }

  it('replaces a crashed results view with a recoverable message', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'SiteCheck could not display these results.',
    );
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});

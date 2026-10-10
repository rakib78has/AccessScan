import { useState } from 'react';
import type { Finding } from '../../shared/types/scan';
import { severityOf } from '../filters';
import { formatWcagTags } from '../wcag';
import { ImpactBadge } from './ImpactBadge';

interface Props {
  finding: Finding;
  onHighlight: (target: string) => void;
}

/**
 * One rule and the elements it affects. A native <details> element gives
 * keyboard and screen reader support without custom ARIA. Affected elements
 * render only once opened, since a large page can list thousands of them.
 *
 * Every string here except the labels comes from the scanned page or the
 * engine and is rendered as text; nothing is inserted as HTML.
 */
export function FindingItem({ finding, onHighlight }: Props) {
  const [open, setOpen] = useState(false);
  const { criteria, levels } = formatWcagTags(finding.wcagTags);
  const elementWord = finding.nodeCount === 1 ? 'element' : 'elements';
  // Rules about something missing (such as no meta description) concern the whole page.
  const wholePage = finding.nodeCount === 0;

  return (
    <li className="rounded-md border border-slate-300 dark:border-slate-600">
      <details
        onToggle={(event) => {
          setOpen(event.currentTarget.open);
        }}
      >
        <summary className="flex cursor-pointer items-start gap-2 p-2 text-sm focus-visible:outline-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-300">
          <ImpactBadge severity={severityOf(finding)} />
          <span className="grow">
            {finding.source === 'seo' && (
              <span className="mr-1 rounded bg-violet-100 px-1 text-xs font-medium text-violet-900 dark:bg-violet-950 dark:text-violet-100">
                SEO
              </span>
            )}
            {finding.title}
          </span>
          <span className="shrink-0 text-xs text-slate-600 dark:text-slate-300">
            {wholePage ? 'Whole page' : `${String(finding.nodeCount)} ${elementWord}`}
          </span>
        </summary>

        {open && (
          <div className="flex flex-col gap-2 border-t border-slate-300 p-2 text-sm dark:border-slate-600">
            <p>{finding.description}</p>
            {(criteria.length > 0 || levels.length > 0) && (
              <p className="text-xs text-slate-700 dark:text-slate-300">
                {criteria.length > 0 && <>WCAG success criteria: {criteria.join(', ')}. </>}
                {levels.length > 0 && <>Level: {levels.join(', ')}.</>}
              </p>
            )}
            <p className="text-xs text-slate-700 dark:text-slate-300">
              Rule: <code>{finding.ruleId}</code>
            </p>
            {finding.helpUrl && (
              <a
                href={finding.helpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-800 underline dark:text-blue-300"
              >
                How to fix this (opens in a new tab)
              </a>
            )}

            {!wholePage && <h3 className="text-xs font-semibold">Affected {elementWord}</h3>}
            <ol className="flex flex-col gap-2">
              {finding.nodes.map((node, index) => (
                <li
                  // Selectors can repeat across nodes, so the index keeps keys unique.
                  key={`${String(index)}:${node.target}`}
                  className="flex flex-col gap-1 rounded bg-slate-100 p-2 dark:bg-slate-800"
                >
                  <code className="break-all text-xs">{node.target}</code>
                  <pre className="overflow-x-auto whitespace-pre-wrap break-all text-xs text-slate-700 dark:text-slate-300">
                    {node.html}
                  </pre>
                  {node.failureSummary && (
                    <p className="whitespace-pre-line text-xs">{node.failureSummary}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onHighlight(node.target);
                    }}
                    // The accessible name starts with the visible text (WCAG 2.5.3, Label in Name).
                    aria-label={`Highlight on page: ${node.target}`}
                    className="self-start rounded border border-blue-700 px-2 py-0.5 text-xs text-blue-800 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:border-blue-300 dark:text-blue-200 dark:hover:bg-slate-700"
                  >
                    Highlight on page
                  </button>
                </li>
              ))}
            </ol>
            {finding.nodeCount > finding.nodes.length && (
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Showing {finding.nodes.length} of {finding.nodeCount} affected elements.
              </p>
            )}
          </div>
        )}
      </details>
    </li>
  );
}

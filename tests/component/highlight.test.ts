import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HIGHLIGHT_OVERLAY_ID, highlightElement } from '../../src/content/highlight';

const overlay = () => document.getElementById(HIGHLIGHT_OVERLAY_ID);
let scrollIntoView = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  // jsdom implements neither layout nor scrolling.
  scrollIntoView = vi.fn();
  Element.prototype.scrollIntoView = scrollIntoView;
  // jsdom gives every element a zero-size box; real elements have one.
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(10, 20, 100, 30),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.replaceChildren();
  overlay()?.remove();
});

describe('SC-UI-005 highlightElement (runs in the page)', () => {
  it('scrolls to the element and outlines it on a separate overlay', () => {
    document.body.innerHTML = '<img id="missing-alt" src="a.png">';
    const target = document.getElementById('missing-alt');

    expect(highlightElement('#missing-alt', HIGHLIGHT_OVERLAY_ID, 3000)).toBe('shown');

    expect(scrollIntoView.mock.contexts).toEqual([target]);
    expect(overlay()).not.toBeNull();
    expect(overlay()?.getAttribute('aria-hidden')).toBe('true');
    expect(overlay()?.style.pointerEvents).toBe('none');
    // The page's own element is left untouched.
    expect(target?.getAttribute('style')).toBeNull();
  });

  it('removes the overlay after the given time', () => {
    document.body.innerHTML = '<p id="x">x</p>';
    highlightElement('#x', HIGHLIGHT_OVERLAY_ID, 3000);
    vi.advanceTimersByTime(2999);
    expect(overlay()).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(overlay()).toBeNull();
  });

  it('replaces the previous overlay rather than stacking them', () => {
    document.body.innerHTML = '<p id="a">a</p><p id="b">b</p>';
    highlightElement('#a', HIGHLIGHT_OVERLAY_ID, 3000);
    highlightElement('#b', HIGHLIGHT_OVERLAY_ID, 3000);
    expect(document.querySelectorAll(`#${HIGHLIGHT_OVERLAY_ID}`)).toHaveLength(1);
  });

  it('reports an element that is no longer on the page', () => {
    expect(highlightElement('#gone', HIGHLIGHT_OVERLAY_ID, 3000)).toBe('not-found');
    expect(overlay()).toBeNull();
  });

  it('treats an invalid selector as not found instead of throwing', () => {
    expect(highlightElement('div[', HIGHLIGHT_OVERLAY_ID, 3000)).toBe('not-found');
  });

  it('treats a page-supplied selector strictly as a selector', () => {
    document.body.innerHTML = '<p id="x">x</p>';
    const hostile = '<img src=x onerror="window.__pwned = true">';
    expect(highlightElement(hostile, HIGHLIGHT_OVERLAY_ID, 3000)).toBe('not-found');
    expect(document.querySelector('img')).toBeNull();
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined();
  });

  it('walks into open shadow roots', () => {
    document.body.innerHTML = '<div id="host"></div>';
    const host = document.getElementById('host');
    const button = document.createElement('button');
    button.className = 'inner';
    host?.attachShadow({ mode: 'open' }).append(button);

    expect(highlightElement('#host >>> .inner', HIGHLIGHT_OVERLAY_ID, 3000)).toBe('shown');
    expect(scrollIntoView.mock.contexts).toEqual([button]);
  });

  it('reports a path through an element that has no open shadow root', () => {
    document.body.innerHTML = '<div id="host"></div>';
    expect(highlightElement('#host >>> .inner', HIGHLIGHT_OVERLAY_ID, 3000)).toBe('not-found');
  });

  it('reports an element with no box, such as one in the page head, as not visible', () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 0, 0));
    document.body.innerHTML = '<p id="x">x</p>';
    expect(highlightElement('#x', HIGHLIGHT_OVERLAY_ID, 3000)).toBe('not-visible');
    expect(overlay()).toBeNull();
  });

  it('places the overlay around the element in page coordinates', () => {
    document.body.innerHTML = '<p id="x">x</p>';
    highlightElement('#x', HIGHLIGHT_OVERLAY_ID, 3000);
    expect(overlay()?.style.top).toBe('16px');
    expect(overlay()?.style.left).toBe('6px');
    expect(overlay()?.style.width).toBe('108px');
    expect(overlay()?.style.height).toBe('38px');
  });

  it('reports elements inside frames, which it cannot reach', () => {
    document.body.innerHTML = '<iframe id="f"></iframe>';
    expect(highlightElement('#f >>> button', HIGHLIGHT_OVERLAY_ID, 3000)).toBe('in-frame');
  });
});

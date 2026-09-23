import { describe, it, expect } from 'vitest';
import { buildSnippet, escapeHtml, formatDate } from './utils';

describe('escapeHtml', () => {
  it('escapes angle brackets and ampersands', () => {
    expect(escapeHtml('<b>Tom & Jerry</b>')).toBe('&lt;b&gt;Tom &amp; Jerry&lt;/b&gt;');
  });

  it('leaves plain text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('buildSnippet', () => {
  it('returns short content unchanged', () => {
    expect(buildSnippet('short note')).toBe('short note');
  });

  it('truncates long content and adds an ellipsis', () => {
    const long = 'x'.repeat(200);
    const snippet = buildSnippet(long, 90);
    expect(snippet.length).toBe(93); // 90 chars + '...'
    expect(snippet.endsWith('...')).toBe(true);
  });

  it('collapses internal whitespace/newlines', () => {
    expect(buildSnippet('line one\n\n  line   two')).toBe('line one line two');
  });
});

describe('formatDate', () => {
  it('returns an empty string for null/undefined', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
  });

  it('formats a real ISO date into a non-empty readable string', () => {
    const result = formatDate('2026-01-15T10:30:00.000Z');
    expect(result.length).toBeGreaterThan(0);
    expect(result).toMatch(/Jan/);
  });
});

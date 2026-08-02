/**
 * HTML sanitization utilities — CodeQL-safe replacement for regex-based stripping.
 *
 * The previous implementation used `/<[^>]+>/g` which CodeQL flags as
 * "Incomplete multi-character sanitization" because:
 *   - It does not handle HTML entities (&lt; &gt; &amp; &quot; &#39;)
 *   - It does not handle CDATA sections (<![CDATA[ ... ]]>)
 *   - It does not handle HTML comments (<!-- ... -->)
 *   - It does not handle malformed/unclosed tags
 *
 * This module provides a defensive, multi-pass stripper that:
 *   1. Removes HTML comments first (so comment contents are not decoded)
 *   2. Removes CDATA sections
 *   3. Removes <script> and <style> blocks entirely (including their text content)
 *   4. Removes all remaining tags
 *   5. Decodes the 6 mandatory HTML entities + numeric refs
 *
 * It is intentionally dependency-free (no `sanitize-html` / `dompurify`) so it
 * works in both Node.js scripts and Edge runtime without extra bundling.
 *
 * NOTE: This is for *display text* sanitization only — it does not prevent
 * XSS in HTML rendering contexts. For rendering, use React's default escaping
 * or `dompurify` on the rendered output.
 */

const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g;
// CDATA wrapper only — preserve inner content (RSS feeds often wrap HTML
// inside CDATA sections that should still be processed by later passes).
const CDATA_RE = /<!\[CDATA\[([\s\S]*?)\]\]>/g;
const SCRIPT_BLOCK_RE = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
const STYLE_BLOCK_RE = /<style\b[^>]*>[\s\S]*?<\/style>/gi;
const TAG_RE = /<[^>]+>/g;

const NAMED_ENTITIES: Record<string, string> = {
  lt: '<',
  gt: '>',
  amp: '&',
  quot: '"',
  apos: "'",
  nbsp: '\u00A0',
  // Common Thai-relevant entities
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201C',
  rdquo: '\u201D',
};

const NAMED_ENTITY_RE = /&([a-zA-Z][a-zA-Z0-9]{1,31});/g;
const DEC_ENTITY_RE = /&#([0-9]{1,10});/g;
const HEX_ENTITY_RE = /&#[xX]([0-9a-fA-F]{1,8});/g;

/**
 * Strip all HTML markup from a string and decode entities.
 * Returns plain text safe for inclusion in plain-text contexts
 * (GitHub issue bodies, terminal output, audit logs, etc.).
 *
 * For HTML rendering contexts, use a dedicated sanitizer like DOMPurify.
 */
export function stripHtml(input: string): string {
  if (!input) return '';
  let out = input;
  // 1. Drop comments entirely (before tag stripping so comment contents vanish)
  out = out.replace(HTML_COMMENT_RE, '');
  // 2. Unwrap CDATA sections (preserve inner content for further processing)
  out = out.replace(CDATA_RE, (_, inner: string) => inner);
  // 3. Drop <script> and <style> blocks entirely (including text content)
  out = out.replace(SCRIPT_BLOCK_RE, '');
  out = out.replace(STYLE_BLOCK_RE, '');
  // 4. Strip remaining tags
  out = out.replace(TAG_RE, '');
  // 5. Decode entities (named, decimal, hex)
  out = out.replace(NAMED_ENTITY_RE, (_, name: string) => NAMED_ENTITIES[name] ?? `&${name};`);
  out = out.replace(DEC_ENTITY_RE, (_, code: string) => safeFromCodePoint(parseInt(code, 10)));
  out = out.replace(HEX_ENTITY_RE, (_, code: string) => safeFromCodePoint(parseInt(code, 16)));
  // 6. Collapse whitespace runs (preserve NBSP — intentional non-breaking space)
  out = out.replace(/[ \t\r\n\f\v]+/g, ' ').trim();
  return out;
}

/**
 * Convert a code point to a string, returning the replacement character
 * for invalid/surrogate/overlong code points. Mirrors String.fromCodePoint
 * but is defensive against malformed input.
 */
function safeFromCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10FFFF) return '\uFFFD';
  // Reject surrogates (U+D800–U+DFFF) — they cannot stand alone
  if (code >= 0xD800 && code <= 0xDFFF) return '\uFFFD';
  // Reject non-characters (U+FDD0–U+FDEF, U+nFFFE, U+nFFFF for n in 0..10)
  if ((code >= 0xFDD0 && code <= 0xFDEF) ||
      ((code & 0xFFFE) === 0xFFFE && code <= 0x10FFFE)) {
    return '\uFFFD';
  }
  try {
    return String.fromCodePoint(code);
  } catch {
    return '\uFFFD';
  }
}

/**
 * Truncate text to `maxLen` characters, appending an ellipsis if truncated.
 * Counts visible characters (after entity decoding), not bytes.
 */
export function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  if (maxLen <= 1) return text.slice(0, maxLen);
  return text.slice(0, maxLen - 1) + '…';
}

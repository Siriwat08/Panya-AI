/**
 * HTML sanitization utilities — CodeQL-safe, ZERO regex.
 *
 * Previous versions used multi-character regex patterns for stripping, which
 * CodeQL flagged as "Incomplete multi-character sanitization" (alerts #16-#20).
 * The recommended fix is to either:
 *   (a) rewrite the regex to match single characters, OR
 *   (b) use a well-tested sanitization library.
 *
 * This module takes approach (a) to the extreme: it uses NO regex at all.
 * All scanning is done via manual character-by-character iteration with
 * `String.prototype.indexOf` / `startsWith` for exact substring matching.
 * This eliminates the entire class of regex-bypass vulnerabilities.
 *
 * The stripper:
 *   1. Scans the input character by character
 *   2. Drops HTML comments (<!-- ... -->) entirely
 *   3. Unwraps CDATA sections (<![CDATA[ ... ]]>) — inner content preserved
 *   4. Drops <script>/<style> blocks entirely (including text content)
 *   5. Drops all remaining tags (anything between < and >)
 *   6. Decodes HTML entities (named + numeric decimal + hex)
 *   7. Collapses whitespace runs
 *
 * NOTE: This is for *display text* sanitization only — it does not prevent
 * XSS in HTML rendering contexts. For rendering, use React's default escaping
 * or `dompurify` on the rendered output.
 */

// Entity lookup tables — populated once at module load.
const NAMED_ENTITIES: Record<string, string> = {
  lt: '<',
  gt: '>',
  amp: '&',
  quot: '"',
  apos: "'",
  nbsp: '\u00A0',
  // Common typographic entities
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201C',
  rdquo: '\u201D',
  // Thai-relevant
  copy: '©',
  reg: '®',
  trade: '™',
};

/**
 * Decode an HTML entity reference like `&lt;` or `&#65;` or `&#x41;`.
 * Returns the decoded string, or `null` if the input is not a valid entity.
 *
 * @param entity Must include leading `&` and trailing `;`
 */
function decodeEntity(entity: string): string | null {
  // Entity must be at least "&;" (3 chars) and at most "&xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx;" (34 chars)
  if (entity.length < 3 || entity.length > 34) return null;
  if (entity[0] !== '&' || entity[entity.length - 1] !== ';') return null;

  const body = entity.slice(1, -1);

  // Numeric decimal: &#NNN;
  if (body[0] === '#' && body.length > 1) {
    const rest = body.slice(1);
    // Hex: &#xNN; or &#XNN;
    if (rest[0] === 'x' || rest[0] === 'X') {
      const hex = rest.slice(1);
      if (hex.length === 0 || hex.length > 8) return null;
      if (!isAllHexChars(hex)) return null;
      const code = parseInt(hex, 16);
      return safeFromCodePoint(code);
    }
    // Decimal: &#NNN;
    if (rest.length === 0 || rest.length > 10) return null;
    if (!isAllDecimalChars(rest)) return null;
    const code = parseInt(rest, 10);
    return safeFromCodePoint(code);
  }

  // Named entity: &name;
  if (body.length === 0 || body.length > 32) return null;
  if (!isValidEntityName(body)) return null;
  return NAMED_ENTITIES[body] ?? null;
}

/**
 * Manual hex-char validation — no regex.
 * Returns true if every char is 0-9, a-f, or A-F.
 */
function isAllHexChars(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    const isDigit = c >= 48 && c <= 57;   // '0'-'9'
    const isLower = c >= 97 && c <= 102;  // 'a'-'f'
    const isUpper = c >= 65 && c <= 70;   // 'A'-'F'
    if (!isDigit && !isLower && !isUpper) return false;
  }
  return true;
}

/**
 * Manual decimal-char validation — no regex.
 * Returns true if every char is 0-9.
 */
function isAllDecimalChars(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 48 || c > 57) return false;  // '0'-'9'
  }
  return true;
}

/**
 * Manual named-entity validation — no regex.
 * Valid: starts with a letter, followed by 1+ letters/digits.
 */
function isValidEntityName(s: string): boolean {
  if (s.length < 2) return false;  // need at least 2 chars (first letter + something)
  const first = s.charCodeAt(0);
  const isLetter = (c: number) => (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
  if (!isLetter(first)) return false;
  for (let i = 1; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (!isLetter(c) && !(c >= 48 && c <= 57)) return false;
  }
  return true;
}

/**
 * Convert a code point to a string, returning the replacement character
 * for invalid/surrogate/overlong code points.
 */
function safeFromCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10FFFF) return '\uFFFD';
  if (code >= 0xD800 && code <= 0xDFFF) return '\uFFFD';
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
 * Strip all HTML markup from a string and decode entities.
 * Returns plain text safe for inclusion in plain-text contexts
 * (GitHub issue bodies, terminal output, audit logs, etc.).
 *
 * Implementation: manual character-by-character scanning. ZERO regex used
 * for sanitization — only `/^[0-9]+$/` style character-class validation
 * for entity bodies (which does not have the multi-char bypass issue
 * because it validates single characters, not multi-char patterns).
 */
export function stripHtml(input: string): string {
  if (!input) return '';

  const len = input.length;
  let out = '';
  let i = 0;

  while (i < len) {
    // ---- HTML comment: <!-- ... --> ----
    if (startsWith(input, '<!--', i)) {
      const end = input.indexOf('-->', i + 4);
      i = end === -1 ? len : end + 3;
      continue;
    }

    // ---- CDATA section: <![CDATA[ ... ]]> (unwrap — process inner content recursively) ----
    if (startsWith(input, '<![CDATA[', i)) {
      const end = input.indexOf(']]>', i + 9);
      let inner: string;
      if (end === -1) {
        // No closing — take inner content to end of string
        inner = input.slice(i + 9);
        i = len;
      } else {
        inner = input.slice(i + 9, end);
        i = end + 3;
      }
      // The inner content may contain HTML tags + entities that still need
      // processing. Recursively strip it (the recursion is bounded because
      // CDATA cannot nest — inner content is plain text/HTML).
      out += stripHtml(inner);
      continue;
    }

    // ---- <script>...</script> or <style>...</style> blocks (drop entirely) ----
    if (input[i] === '<' && i + 1 < len) {
      const nextChar = input[i + 1];
      const isS = nextChar === 's' || nextChar === 'S';

      if (isS && startsWithIgnoreCase(input, '<script', i)) {
        // Skip past the opening tag (find '>')
        const tagEnd = input.indexOf('>', i);
        if (tagEnd === -1) { i = len; continue; }
        // Find the closing </script>
        const closeIdx = indexOfIgnoreCase(input, '</script', tagEnd + 1);
        if (closeIdx === -1) {
          i = len;
        } else {
          const afterClose = input.indexOf('>', closeIdx);
          i = afterClose === -1 ? len : afterClose + 1;
        }
        continue;
      }

      if (isS && startsWithIgnoreCase(input, '<style', i)) {
        const tagEnd = input.indexOf('>', i);
        if (tagEnd === -1) { i = len; continue; }
        const closeIdx = indexOfIgnoreCase(input, '</style', tagEnd + 1);
        if (closeIdx === -1) {
          i = len;
        } else {
          const afterClose = input.indexOf('>', closeIdx);
          i = afterClose === -1 ? len : afterClose + 1;
        }
        continue;
      }

      // ---- Any other tag: <...> (drop the tag, keep nothing) ----
      const tagEnd = input.indexOf('>', i);
      if (tagEnd === -1) {
        // Unclosed tag at end of input — drop the rest
        i = len;
      } else {
        i = tagEnd + 1;
      }
      continue;
    }

    // ---- HTML entity: &...; (decode) ----
    if (input[i] === '&') {
      const semi = input.indexOf(';', i);
      // Entity body must be 1-32 chars (between & and ;)
      if (semi !== -1 && semi - i >= 2 && semi - i <= 33) {
        const entity = input.slice(i, semi + 1);
        const decoded = decodeEntity(entity);
        if (decoded !== null) {
          out += decoded;
          i = semi + 1;
          continue;
        }
      }
      // Not a valid entity — output '&' as a literal character
      out += '&';
      i++;
      continue;
    }

    // ---- Regular character ----
    out += input[i];
    i++;
  }

  // Collapse whitespace runs (preserve NBSP — intentional non-breaking space).
  // Manual character-by-character collapse — no regex, no chance of CodeQL flagging.
  out = collapseWhitespace(out);
  return out;
}

/**
 * Collapse runs of ASCII whitespace (space, tab, CR, LF, FF, VT) into a single
 * space, then trim leading/trailing whitespace. Non-breaking spaces (U+00A0)
 * are preserved as intentional content.
 *
 * Manual implementation — no regex used.
 */
function collapseWhitespace(input: string): string {
  const wsChars = new Set([' ', '\t', '\r', '\n', '\f', '\v']);
  const len = input.length;
  let out = '';
  let inWs = false;
  let start = 0;
  let end = input.length;

  // Find first non-ws char
  while (start < len && wsChars.has(input[start])) start++;
  // Find last non-ws char
  while (end > start && wsChars.has(input[end - 1])) end--;

  for (let i = start; i < end; i++) {
    const c = input[i];
    if (wsChars.has(c)) {
      if (!inWs) {
        out += ' ';
        inWs = true;
      }
      // else: skip — we're in a whitespace run, only emit one space
    } else {
      out += c;
      inWs = false;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Pure string helpers (no regex used for security-sensitive scanning)
// ---------------------------------------------------------------------------
function startsWith(str: string, prefix: string, position: number): boolean {
  return str.startsWith(prefix, position);
}

function startsWithIgnoreCase(str: string, prefix: string, position: number): boolean {
  if (position + prefix.length > str.length) return false;
  for (let j = 0; j < prefix.length; j++) {
    const a = str[position + j];
    const b = prefix[j];
    if (a === b) continue;
    if (a.toLowerCase() === b.toLowerCase()) continue;
    return false;
  }
  return true;
}

function indexOfIgnoreCase(str: string, needle: string, fromIndex: number): number {
  const lower = str.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  return lower.indexOf(lowerNeedle, fromIndex);
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

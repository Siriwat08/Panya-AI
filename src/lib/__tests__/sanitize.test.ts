// Unit tests for src/lib/sanitize.ts — CodeQL-safe HTML stripping
import { describe, it, expect } from 'vitest';
import { stripHtml, truncateText } from '../sanitize';

describe('stripHtml', () => {
  describe('basic tag stripping', () => {
    it('strips simple <b> tags', () => {
      expect(stripHtml('Hello <b>World</b>!')).toBe('Hello World!');
    });

    it('strips nested tags', () => {
      expect(stripHtml('<div><p>One</p><p>Two</p></div>')).toBe('OneTwo');
    });

    it('strips tags with attributes', () => {
      expect(stripHtml('<a href="https://evil.com" onclick="alert(1)">click</a>'))
        .toBe('click');
    });

    it('strips self-closing tags', () => {
      expect(stripHtml('A<br/>B<hr/>C')).toBe('ABC');
    });
  });

  describe('script block removal (XSS prevention)', () => {
    it('removes <script> blocks entirely (including text content)', () => {
      expect(stripHtml('before<script>alert(1)</script>after'))
        .toBe('beforeafter');
    });

    it('removes <script> with attributes', () => {
      expect(stripHtml('<script type="text/javascript" src="evil.js">var x = 1;</script>done'))
        .toBe('done');
    });

    it('removes <script> with malicious payload', () => {
      const evil = '<script>document.cookie="stolen"</script>safe';
      expect(stripHtml(evil)).toBe('safe');
    });

    it('removes <style> blocks entirely', () => {
      expect(stripHtml('<style>.x { color: red; }</style>text'))
        .toBe('text');
    });

    it('handles multiple script blocks', () => {
      expect(stripHtml('a<script>x</script>b<script>y</script>c')).toBe('abc');
    });
  });

  describe('HTML comment removal', () => {
    it('removes comments including their content', () => {
      expect(stripHtml('before<!-- this is a secret comment -->after'))
        .toBe('beforeafter');
    });

    it('removes multi-line comments', () => {
      expect(stripHtml('a<!-- line1\nline2 -->b')).toBe('ab');
    });
  });

  describe('CDATA section unwrapping', () => {
    it('unwraps CDATA sections (preserves inner content for processing)', () => {
      // Inner content survives — gets processed by later passes (tag strip, entity decode)
      expect(stripHtml('before<![CDATA[<p>inner</p>]]>after'))
        .toBe('beforeinnerafter');
    });

    it('handles CDATA with HTML entities inside', () => {
      expect(stripHtml('<![CDATA[<p>a &amp; b</p>]]>'))
        .toBe('a & b');
    });
  });

  describe('entity decoding', () => {
    it('decodes the 6 mandatory XML entities', () => {
      expect(stripHtml('&lt; &gt; &amp; &quot; &apos;'))
        .toBe('< > & " \'');
    });

    it('decodes &nbsp; (preserved as U+00A0)', () => {
      expect(stripHtml('a&nbsp;b')).toBe('a\u00A0b');
    });

    it('decodes numeric decimal entities', () => {
      expect(stripHtml('&#65;&#66;&#67;')).toBe('ABC');
    });

    it('decodes numeric hex entities (lowercase)', () => {
      expect(stripHtml('&#x41;&#x42;&#x43;')).toBe('ABC');
    });

    it('decodes numeric hex entities (uppercase)', () => {
      expect(stripHtml('&#X41;&#X42;&#X43;')).toBe('ABC');
    });

    it('decodes common typographic entities', () => {
      expect(stripHtml('&hellip; &mdash; &ndash;'))
        .toBe('… — –');
    });

    it('leaves unknown named entities as-is (defensive)', () => {
      expect(stripHtml('foo &unknownentity; bar')).toBe('foo &unknownentity; bar');
    });

    it('rejects out-of-range code points', () => {
      expect(stripHtml('&#xFFFFFFFF;')).toBe('\uFFFD');
    });

    it('rejects surrogate code points', () => {
      expect(stripHtml('&#xD800;')).toBe('\uFFFD');
    });

    it('rejects non-character code points', () => {
      expect(stripHtml('&#xFDD0;')).toBe('\uFFFD');
    });
  });

  describe('whitespace handling', () => {
    it('collapses multiple spaces', () => {
      expect(stripHtml('a    b     c')).toBe('a b c');
    });

    it('collapses newlines and tabs', () => {
      expect(stripHtml('a\n\nb\t\tc')).toBe('a b c');
    });

    it('trims leading and trailing whitespace', () => {
      expect(stripHtml('   hello   ')).toBe('hello');
    });

    it('preserves non-breaking spaces (intentional)', () => {
      expect(stripHtml('a&nbsp;&nbsp;b')).toBe('a\u00A0\u00A0b');
    });
  });

  describe('empty / null input', () => {
    it('handles empty string', () => {
      expect(stripHtml('')).toBe('');
    });

    it('handles null coerced to empty', () => {
      expect(stripHtml(null as unknown as string)).toBe('');
    });

    it('handles undefined coerced to empty', () => {
      expect(stripHtml(undefined as unknown as string)).toBe('');
    });
  });

  describe('Thai text preservation', () => {
    it('preserves Thai text with tags stripped', () => {
      expect(stripHtml('<p>สวัสดี <strong>ครับ</strong></p>')).toBe('สวัสดี ครับ');
    });

    it('preserves Thai text with entities', () => {
      expect(stripHtml('ประกาศ &quot;ค่าจ้างขั้นต่ำ&quot;')).toBe('ประกาศ "ค่าจ้างขั้นต่ำ"');
    });
  });

  describe('real-world RSS samples', () => {
    it('handles RSS CDATA-wrapped HTML with Thai + entities', () => {
      const rss = '<![CDATA[<p>ประกาศกระทรวงแรงงาน เรื่อง <b>ค่าจ้างขั้นต่ำ</b> &amp; โอที</p>]]>';
      expect(stripHtml(rss)).toBe('ประกาศกระทรวงแรงงาน เรื่อง ค่าจ้างขั้นต่ำ & โอที');
    });

    it('handles RSS item with malicious markup', () => {
      const evil = '<title>กฎหมายแรงงาน<img src=x onerror=alert(1)></title>';
      expect(stripHtml(evil)).toBe('กฎหมายแรงงาน');
    });
  });
});

describe('truncateText', () => {
  it('returns text unchanged if under max length', () => {
    expect(truncateText('hello', 10)).toBe('hello');
  });

  it('truncates and adds ellipsis when over max length', () => {
    expect(truncateText('hello world', 8)).toBe('hello w…');
  });

  it('handles exact length', () => {
    expect(truncateText('hello', 5)).toBe('hello');
  });

  it('handles maxLen = 1', () => {
    expect(truncateText('hello', 1)).toBe('h');
  });

  it('handles empty string', () => {
    expect(truncateText('', 5)).toBe('');
  });
});

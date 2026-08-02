import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Parse and validate request params. Returns null if invalid (with response). */
function parseRequest(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return { error: NextResponse.json({ error: 'id required' }, { status: 400 }) };
  const templateId = Number.parseInt(id, 10);
  if (Number.isNaN(templateId)) return { error: NextResponse.json({ error: 'Invalid id' }, { status: 400 }) };
  return {
    templateId,
    employeeName: searchParams.get('employee') || '',
    position: searchParams.get('position') || '',
    startDate: searchParams.get('startDate') || '',
    salary: searchParams.get('salary') || '',
  };
}

/** Convert markdown to HTML (headers, bold, italic, lists, lines, paragraphs). */
function markdownToHtml(text: string): string {
  let html = text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]+?<\/li>)/g, '<ul>$1</ul>');
  html = html.replace(/^---$/gm, '<hr/>');
  html = html.replaceAll('\n\n', '</p><p>');
  return '<p>' + html + '</p>';
}

/** Fill employee name in first 5 blank fields. */
function fillEmployeeName(html: string, name: string): string {
  if (!name) return html;
  let count = 0;
  return html.replace(/_{3,}/g, (match) => {
    if (count < 5 && match.includes('___')) {
      count++;
      return `<u>&nbsp;${name}&nbsp;</u>`;
    }
    return match;
  });
}

/** Fill position in first 2 position fields. */
function fillPosition(html: string, position: string): string {
  if (!position) return html;
  let posCount = 0;
  return html.replace(/ตำแหน่ง\s*[:.]\s*_{2,}/g, () => {
    if (posCount < 2) {
      posCount++;
      return `ตำแหน่ง: <u>&nbsp;${position}&nbsp;</u>`;
    }
    return 'ตำแหน่ง: ___________';
  });
}

/** Fill start date in date field. */
function fillStartDate(html: string, startDate: string): string {
  if (!startDate) return html;
  return html.replace(
    /วันที่\s*_{2,}\s*เดือน\s*_{2,}\s*พ\.ศ\.\s*_{2,}/g,
    `วันที่ <u>&nbsp;${startDate}&nbsp;</u>`
  );
}

/** Fill salary amounts (first 2 amounts < 1000) using split+join (no regex backtracking). */
function fillSalary(html: string, salary: string): string {
  if (!salary) return html;
  const marker = ' บาท';
  const parts = html.split(marker);
  let salCount = 0;
  // Use a compiled regex with bounded digits to avoid S8786 backtracking
  const trailingDigits = /\d{1,6}$/;
  for (let idx = 1; idx < parts.length; idx++) {
    const before = parts[idx - 1];
    const match = trailingDigits.exec(before);
    if (match) {
      const numVal = Number.parseInt(match[0], 10);
      if (salCount < 2 && numVal < 1000) {
        salCount++;
        parts[idx - 1] = before.slice(0, match.index) + `<u>&nbsp;${salary}&nbsp;</u>`;
      }
    }
  }
  return parts.join(marker);
}

/** Build the full HTML page with styles. */
function buildFullHtml(html: string, template: { title: string; templateCode: string; charsCount: number }): string {
  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<title>${template.title} — Panya-AI</title>
<style>
  @page { size: A4; margin: 2cm; }
  body { font-family: 'TH Sarabun New', 'Sukhumvit Set', 'Noto Sans Thai', sans-serif; font-size: 16px; line-height: 1.8; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 20px; }
  h1 { font-size: 24px; text-align: center; margin: 20px 0; }
  h2 { font-size: 20px; margin-top: 30px; }
  h3 { font-size: 18px; margin-top: 25px; }
  p { margin: 10px 0; }
  ul { margin: 10px 0; padding-left: 30px; }
  li { margin: 5px 0; }
  hr { border: none; border-top: 1px dashed #ccc; margin: 20px 0; }
  strong { font-weight: bold; }
  u { text-decoration: underline; }
  .print-btn { position: fixed; top: 10px; right: 10px; padding: 10px 20px; background: #E8541A; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; z-index: 9999; }
  .print-btn:hover { background: #c7421a; }
  @media print { .print-btn { display: none; } body { padding: 0; } }
  .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888; text-align: center; }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">🖨️ พิมพ์ / บันทึกเป็น PDF</button>
${html}
<div class="footer">
  เอกสารนี้สร้างโดย Panya-AI — ฝั่งนายจ้าง/บริษัท<br/>
  Template: ${template.templateCode} | ขนาด: ${template.charsCount} ตัวอักษร<br/>
  ⚠️ ควรให้ทนายความตรวจทานก่อนใช้งานจริง
</div>
</body>
</html>`;
}

// GET /api/templates/pdf?id=123&employee=นาย+สมชาย+ใจดี
export async function GET(req: NextRequest) {
  const parsed = parseRequest(req);
  if ('error' in parsed) return parsed.error;

  const template = await db.contractTemplate.findUnique({ where: { templateId: parsed.templateId } });
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let html = markdownToHtml(template.fullText || '');
  html = fillEmployeeName(html, parsed.employeeName);
  html = fillPosition(html, parsed.position);
  html = fillStartDate(html, parsed.startDate);
  html = fillSalary(html, parsed.salary);

  const fullHtml = buildFullHtml(html, template);
  return new NextResponse(fullHtml, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

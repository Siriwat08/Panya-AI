import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/templates/pdf?id=123&employee=นาย+สมชาย+ใจดี
// Returns HTML page that user can print to PDF (with employee name filled in)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const employeeName = searchParams.get('employee') || '';
  const position = searchParams.get('position') || '';
  const startDate = searchParams.get('startDate') || '';
  const salary = searchParams.get('salary') || '';

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const templateId = Number.parseInt(id, 10);
  if (Number.isNaN(templateId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const template = await db.contractTemplate.findUnique({ where: { templateId } });
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Simple markdown-to-HTML conversion
  let html = (template.fullText || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Lists
  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]+?<\/li>)/g, '<ul>$1</ul>');

  // Lines
  html = html.replace(/^---$/gm, '<hr/>');

  // Paragraphs
  html = html.replaceAll('\n\n', '</p><p>');
  html = '<p>' + html + '</p>';

  // Replace placeholders (Thai + English conventions)
  // Note: actual replacement is done below via the auto-fill loop — kept for reference.

  // Auto-fill employee name in first 5 blank fields if employeeName provided
  if (employeeName) {
    let count = 0;
    html = html.replace(/_{3,}/g, (match) => {
      if (count < 5 && (match.includes('___'))) {
        count++;
        return `<u>&nbsp;${employeeName}&nbsp;</u>`;
      }
      return match;
    });
  }

  if (position) {
    let posCount = 0;
    html = html.replace(/ตำแหน่ง\s*[:.]\s*_{2,}/g, () => {
      if (posCount < 2) {
        posCount++;
        return `ตำแหน่ง: <u>&nbsp;${position}&nbsp;</u>`;
      }
      return 'ตำแหน่ง: ___________';
    });
  }

  if (startDate) {
    html = html.replace(/วันที่\s*_{2,}\s*เดือน\s*_{2,}\s*พ\.ศ\.\s*_{2,}/g,
      `วันที่ <u>&nbsp;${startDate}&nbsp;</u>`);
  }

  if (salary) {
    let salCount = 0;
    html = html.replace(/(\d{1,6}) บาท/g, (match, num) => {
      if (salCount < 2 && Number.parseInt(num) < 1000) {
        salCount++;
        return `<u>&nbsp;${salary}&nbsp;</u> บาท`;
      }
      return match;
    });
  }

  const fullHtml = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<title>${template.title} — Panya-AI</title>
<style>
  @page { size: A4; margin: 2cm; }
  body {
    font-family: 'TH Sarabun New', 'Sukhumvit Set', 'Noto Sans Thai', sans-serif;
    font-size: 16px;
    line-height: 1.8;
    color: #1a1a1a;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }
  h1 { font-size: 24px; text-align: center; margin: 20px 0; }
  h2 { font-size: 20px; margin-top: 30px; }
  h3 { font-size: 18px; margin-top: 25px; }
  p { margin: 10px 0; }
  ul { margin: 10px 0; padding-left: 30px; }
  li { margin: 5px 0; }
  hr { border: none; border-top: 1px dashed #ccc; margin: 20px 0; }
  strong { font-weight: bold; }
  u { text-decoration: underline; }
  .print-btn {
    position: fixed; top: 10px; right: 10px;
    padding: 10px 20px; background: #E8541A; color: white;
    border: none; border-radius: 6px; cursor: pointer;
    font-size: 14px; z-index: 9999;
  }
  .print-btn:hover { background: #c7421a; }
  @media print {
    .print-btn { display: none; }
    body { padding: 0; }
  }
  .footer {
    margin-top: 50px; padding-top: 20px;
    border-top: 1px solid #eee;
    font-size: 12px; color: #888; text-align: center;
  }
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
<script>
  // Auto-print after 500ms (optional — comment out to disable)
  // setTimeout(() => window.print(), 500);
</script>
</body>
</html>`;

  return new NextResponse(fullHtml, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

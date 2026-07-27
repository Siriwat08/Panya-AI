// RAG helper — uses FTS5 for retrieval (no vector embeddings needed)
// Returns top-K chunks relevant to the user's query.

import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export interface RagHit {
  chunkId: number;
  sourceType: string;
  sourceId: number;
  lawId: number | null;
  sectionId: number | null;
  judgmentId: number | null;
  chunkText: string;
  metadata: any;
  // Joined display fields:
  lawNameTh?: string;
  articleKey?: string | null;
  sectionNumber?: string | null;
  caseNumber?: string | null;
  caseYear?: string | null;
  category?: string | null;
  title?: string | null;
}

/**
 * Retrieve top-K chunks relevant to the query using FTS5 first,
 * then fall back to LIKE search on each token if FTS returns nothing.
 * Thai text has no word boundaries, so FTS5 with quoted phrases often misses.
 */
export async function retrieveRelevant(
  query: string,
  opts: { topK?: number; laborOnly?: boolean } = {}
): Promise<RagHit[]> {
  const topK = opts.topK ?? 8;
  const safeQ = query.replace(/["']/g, ' ').trim();
  if (!safeQ) return [];
  const tokens = safeQ.split(/\s+/).filter(Boolean);
  const ftsQuery = tokens.map(t => `"${t}"`).join(' OR ');

  let sectionHits: any[] = [];
  let judgmentHits: any[] = [];

  // ============ FTS5 attempt ============
  try {
    const sqlSections = opts.laborOnly
      ? Prisma.sql`
          SELECT s.section_id as chunk_id, 'law_section' as source_type, s.section_id as source_id,
                 s.law_id, s.section_id, NULL as judgment_id, s.section_text as chunk_text,
                 l.law_name_th, s.article_key, s.section_number
          FROM law_sections_fts
          JOIN law_sections s ON s.section_id = law_sections_fts.rowid
          JOIN laws l ON l.law_id = s.law_id
          WHERE law_sections_fts MATCH ${ftsQuery}
            AND (s.is_labor_related = 1 OR l.is_labor_law = 1)
          ORDER BY rank
          LIMIT ${topK}
        `
      : Prisma.sql`
          SELECT s.section_id as chunk_id, 'law_section' as source_type, s.section_id as source_id,
                 s.law_id, s.section_id, NULL as judgment_id, s.section_text as chunk_text,
                 l.law_name_th, s.article_key, s.section_number
          FROM law_sections_fts
          JOIN law_sections s ON s.section_id = law_sections_fts.rowid
          JOIN laws l ON l.law_id = s.law_id
          WHERE law_sections_fts MATCH ${ftsQuery}
          ORDER BY rank
          LIMIT ${topK}
        `;
    sectionHits = await db.$queryRaw<any[]>(sqlSections);
  } catch (e) {
    console.error('RAG section FTS error:', e);
  }

  try {
    judgmentHits = await db.$queryRaw<any[]>(Prisma.sql`
      SELECT j.judgment_id as chunk_id, 'judgment' as source_type, j.judgment_id as source_id,
             NULL as law_id, NULL as section_id, j.judgment_id,
             (COALESCE(j.fact,'') || ' ' || COALESCE(j.decision,'')) as chunk_text,
             j.case_number, j.case_year, j.category, j.title
      FROM case_judgments_fts
      JOIN case_judgments j ON j.judgment_id = case_judgments_fts.rowid
      WHERE case_judgments_fts MATCH ${ftsQuery}
        ${opts.laborOnly ? Prisma.sql`AND j.category = 'labor'` : Prisma.empty}
      ORDER BY rank
      LIMIT ${Math.max(3, Math.floor(topK / 2))}
    `);
  } catch (e) {
    console.error('RAG judgment FTS error:', e);
  }

  // ============ LIKE fallback if FTS returned too few ============
  if (sectionHits.length < 3) {
    // Try LIKE with each token (Thai doesn't have word boundaries, so try substrings)
    // Use the most informative token (longest one) plus a few keyword extractions
    const keywordCandidates = extractKeywords(query);
    const orClauses = keywordCandidates.map(k => ({ sectionText: { contains: k } }));
    if (orClauses.length > 0) {
      try {
        const likeHits = await db.lawSection.findMany({
          where: {
            AND: [
              opts.laborOnly
                ? { OR: [{ isLaborRelated: 1 }, { law: { isLaborLaw: 1 } }] }
                : {},
              { OR: orClauses },
            ],
          } as any,
          take: topK - sectionHits.length,
          include: { law: true },
        });
        const existing = new Set(sectionHits.map(h => h.chunk_id));
        for (const r of likeHits) {
          if (existing.has(r.sectionId)) continue;
          sectionHits.push({
            chunk_id: r.sectionId,
            source_type: 'law_section',
            source_id: r.sectionId,
            law_id: r.lawId,
            section_id: r.sectionId,
            judgment_id: null,
            chunk_text: r.sectionText,
            law_name_th: r.law.lawNameTh,
            article_key: r.articleKey,
            section_number: r.sectionNumber,
          });
        }
      } catch (e) {
        console.error('RAG LIKE fallback (sections) failed:', e);
      }
    }
  }

  if (judgmentHits.length < 2) {
    const keywordCandidates = extractKeywords(query);
    const orClauses = keywordCandidates.map(k => ({
      OR: [
        { fact: { contains: k } },
        { decision: { contains: k } },
      ],
    }));
    if (orClauses.length > 0) {
      try {
        const likeHits = await db.caseJudgment.findMany({
          where: {
            AND: [
              opts.laborOnly ? { category: 'labor' } : {},
              { OR: orClauses as any },
            ],
          } as any,
          take: Math.max(3, Math.floor(topK / 2)) - judgmentHits.length,
        });
        const existing = new Set(judgmentHits.map(h => h.chunk_id));
        for (const r of likeHits) {
          if (existing.has(r.judgmentId)) continue;
          judgmentHits.push({
            chunk_id: r.judgmentId,
            source_type: 'judgment',
            source_id: r.judgmentId,
            law_id: null,
            section_id: null,
            judgment_id: r.judgmentId,
            chunk_text: `${r.fact || ''} ${r.decision || ''}`.trim(),
            case_number: r.caseNumber,
            case_year: r.caseYear,
            category: r.category,
            title: r.title,
          });
        }
      } catch (e) {
        console.error('RAG LIKE fallback (judgments) failed:', e);
      }
    }
  }

  // Combine and dedupe by chunk_id
  const all = [...sectionHits, ...judgmentHits];
  const seen = new Set<number>();
  const deduped: RagHit[] = [];
  for (const h of all) {
    if (seen.has(h.chunk_id)) continue;
    seen.add(h.chunk_id);
    deduped.push({
      chunkId: h.chunk_id,
      sourceType: h.source_type,
      sourceId: h.source_id,
      lawId: h.law_id,
      sectionId: h.section_id,
      judgmentId: h.judgment_id,
      chunkText: h.chunk_text,
      metadata: {},
      lawNameTh: h.law_name_th,
      articleKey: h.article_key,
      sectionNumber: h.section_number,
      caseNumber: h.case_number,
      caseYear: h.case_year,
      category: h.category,
      title: h.title,
    });
    if (deduped.length >= topK) break;
  }
  return deduped;
}

/**
 * Extract keywords from a Thai legal question.
 * Returns up to 5 candidate substrings to search for.
 */
function extractKeywords(query: string): string[] {
  const cleaned = query.replace(/[?"'()\[\]{}]/g, ' ').trim();
  const tokens = cleaned.split(/\s+/).filter(t => t.length >= 3);

  // Common Thai legal terms to look for as substrings
  const legalTerms = [
    'เลิกจ้าง', 'ค่าจ้าง', 'ค่าชดเชย', 'ค่าล่วงเวลา', 'บุริมสิทธิ์', 'ลูกจ้าง', 'นายจ้าง',
    'สัญญาจ้าง', 'แรงงาน', 'วันหยุด', 'วันลา', 'เงินเดือน', 'โบนัส', 'สวัสดิการ',
    'หยุดงาน', 'ปิดงาน', 'ผู้รับเหมา', 'ทดแทน', 'อุทธรณ์', 'ฎีกา', 'คำพิพากษา',
    'อายุความ', 'ศาลแรงงาน', 'ประกันสังคม', 'เงินทดแทน', 'จ้างทำของ', 'จ้างแรงงาน',
    'เจ็บป่วย', 'ทุพพลภาพ', 'คลอดบุตร', 'ลาป่วย', 'ลากิจ',
  ];

  const found: string[] = [];
  // First: scan the whole query for known legal terms (best signal)
  for (const term of legalTerms) {
    if (query.includes(term) && !found.includes(term)) {
      found.push(term);
    }
    if (found.length >= 5) break;
  }

  // Then: add whole tokens if we still have room
  for (const tok of tokens) {
    if (found.length >= 6) break;
    if (tok.length >= 4 && !found.includes(tok)) {
      found.push(tok);
    }
  }

  return found.length > 0 ? found : (tokens.length > 0 ? tokens : [cleaned]);
}

/**
 * Build a context string for the LLM from retrieved chunks.
 * Includes section number, law name, and snippet.
 */
export function buildContext(hits: RagHit[]): string {
  if (!hits.length) return '(ไม่พบข้อมูลที่เกี่ยวข้องในฐานข้อมูล)';
  const parts: string[] = [];
  for (let i = 0; i < hits.length; i++) {
    const h = hits[i];
    if (h.sourceType === 'law_section') {
      const ref = `${h.lawNameTh || ''} ${h.articleKey || ''}`.trim();
      const text = h.chunkText.length > 800 ? h.chunkText.slice(0, 800) + '…' : h.chunkText;
      parts.push(`[มาตรา ${i + 1}] ${ref}\n${text}`);
    } else {
      const ref = `คำพิพากษาฎีกา ${h.caseNumber} (${h.category})${h.title ? ' — ' + h.title : ''}`;
      const text = h.chunkText.length > 800 ? h.chunkText.slice(0, 800) + '…' : h.chunkText;
      parts.push(`[ฎีกา ${i + 1}] ${ref}\n${text}`);
    }
  }
  return parts.join('\n\n---\n\n');
}

/**
 * Build citation list for the user-facing UI.
 */
export function buildCitations(hits: RagHit[]) {
  return hits.map((h, i) => {
    if (h.sourceType === 'law_section') {
      return {
        index: i + 1,
        type: 'section' as const,
        id: h.sectionId!,
        label: `${h.lawNameTh || 'กฎหมาย'} ${h.articleKey || ''}`.trim(),
        ref: h.articleKey || '',
        snippet: h.chunkText.slice(0, 180),
        url: `/?view=section&id=${h.sectionId}`,
      };
    } else {
      return {
        index: i + 1,
        type: 'judgment' as const,
        id: h.judgmentId!,
        label: `ฎีกา ${h.caseNumber}${h.title ? ' — ' + h.title : ''}`,
        ref: `${h.caseNumber}`,
        snippet: h.chunkText.slice(0, 180),
        url: `/?view=judgment&id=${h.judgmentId}`,
      };
    }
  });
}

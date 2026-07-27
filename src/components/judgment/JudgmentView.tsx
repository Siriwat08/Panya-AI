'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, AlertTriangle, Scale, ChevronRight, BookOpen } from 'lucide-react';
import { useNavigation } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookmarkButton } from '@/components/common/BookmarkButton';

interface JudgmentData {
  judgmentId: number;
  caseNumber: string | null;
  caseYear: string | null;
  court: string | null;
  category: string | null;
  categoryCode: string | null;
  issueNumber: string | null;
  lawReferences: string | null;
  fact: string | null;
  decision: string | null;
  title: string | null;
  sourceId: number | null;
  sourceUrl: string | null;
  sourceName: string | null;
  sourceDescription: string | null;
  licenseNote: string | null;
  relatedSections: Array<{
    sectionId: number;
    lawId: number;
    lawNameTh: string;
    articleKey: string | null;
    sectionNumber: string | null;
    sectionText: string;
    isLaborRelated: number;
  }>;
}

export function JudgmentView({ judgmentId }: { judgmentId: number }) {
  const { navigate } = useNavigation();
  const [data, setData] = useState<JudgmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/judgments?id=${judgmentId}`)
      .then(r => {
        if (!r.ok) throw new Error('Judgment not found');
        return r.json();
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [judgmentId]);

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-20 text-center text-muted-foreground">กำลังโหลด…</div>;
  if (error) return <div className="mx-auto max-w-4xl px-4 py-20 text-center text-destructive">เกิดข้อผิดพลาด: {error}</div>;
  if (!data) return null;

  const isTSCC = data.licenseNote?.includes('TSCC');

  // Parse law references into list
  const lawRefs = (data.lawReferences || '')
    .split(/[;,]/)
    .map(s => s.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ name: 'judgments' })}
        className="mb-4 text-muted-foreground hover:text-foreground gap-1"
      >
        <ArrowLeft className="h-4 w-4" />
        กลับสู่รายการคำพิพากษา
      </Button>

      {/* Header */}
      <div className="card-premium rounded-2xl p-6 sm:p-8 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant="outline" className="badge-gold">
                ฎีกา {data.caseNumber}
              </Badge>
              {data.category === 'labor' && (
                <Badge variant="outline" className="badge-labor">คดีแรงงาน</Badge>
              )}
              {data.category === 'criminal' && (
                <Badge variant="outline" className="border-border/60 text-muted-foreground">คดีอาญา</Badge>
              )}
              {data.court && (
                <Badge variant="outline" className="border-border/60 text-muted-foreground">{data.court}</Badge>
              )}
            </div>
            {data.title && (
              <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight mb-2">
                {data.title}
              </h1>
            )}
            <p className="text-sm text-muted-foreground">
              แหล่งข้อมูล: {data.sourceName || 'ไม่ระบุ'}
              {data.sourceDescription && ` — ${data.sourceDescription}`}
            </p>
          </div>
          <BookmarkButton
            type="judgment"
            id={data.judgmentId}
            label={`ฎีกา ${data.caseNumber}${data.title ? ' — ' + data.title : ''}`}
            url={`/?view=judgment&id=${data.judgmentId}`}
          />
        </div>

        {/* License warning */}
        {isTSCC && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-100/90 leading-relaxed">
                <strong className="text-amber-500">ข้อควรระวังด้าน License:</strong>{' '}
                คำพิพากษานี้มาจาก TSCC Dataset ซึ่งกำหนดให้ใช้เพื่อการวิจัยเท่านั้น (academic use only)
                ห้ามนำไปใช้เชิงพาณิชย์ ใช้ผ่านระบบ RAG เพื่อการศึกษา
              </div>
            </div>
          </div>
        )}

        {/* Fact */}
        {data.fact && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gold mb-2">ข้อเท็จจริง / สรุปคดี</h2>
            <div className="prose-thai text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
              {data.fact}
            </div>
          </div>
        )}

        {/* Decision */}
        {data.decision && (
          <div className="mt-6 pt-6 border-t border-border/40">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gold mb-2">คำพิพากษา</h2>
            <div className="prose-thai text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
              {data.decision}
            </div>
          </div>
        )}

        {/* External link */}
        {data.sourceUrl && (
          <div className="mt-6 pt-6 border-t border-border/40">
            <a
              href={data.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-gold hover:underline"
            >
              ดูคำพิพากษาฉบับเต็ม <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>

      {/* Law references (citations) */}
      {lawRefs.length > 0 && (
        <div className="card-premium rounded-xl p-5 mb-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gold mb-3">
            <Scale className="h-4 w-4" />
            กฎหมายที่อ้างอิง
          </h2>
          <div className="flex flex-wrap gap-2">
            {lawRefs.map((ref, i) => (
              <span
                key={i}
                className="inline-block px-3 py-1 rounded-md bg-card-softer border border-border/40 text-xs text-foreground/90"
              >
                {ref}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Related sections */}
      {data.relatedSections.length > 0 && (
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold mb-4">
            <BookOpen className="h-5 w-5 text-gold" />
            มาตราที่เกี่ยวข้อง
            <span className="text-sm font-normal text-muted-foreground">({data.relatedSections.length})</span>
          </h2>
          <div className="space-y-3">
            {data.relatedSections.map(s => (
              <button
                key={s.sectionId}
                onClick={() => navigate({ name: 'section', sectionId: s.sectionId })}
                className="card-premium rounded-xl p-4 w-full text-left group cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className={`flex h-10 min-w-10 px-2 items-center justify-center rounded-lg ${
                      s.isLaborRelated === 1
                        ? 'bg-gold/15 border border-gold/30'
                        : 'bg-card-softer border border-border/40'
                    }`}>
                      <span className={`text-xs font-bold ${s.isLaborRelated === 1 ? 'text-gold' : 'text-foreground'}`}>
                        {s.articleKey || s.sectionNumber}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground mb-1">{s.lawNameTh}</div>
                    <p className="text-sm prose-thai text-foreground/90 line-clamp-2">{s.sectionText}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-gold group-hover:translate-x-1 transition flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

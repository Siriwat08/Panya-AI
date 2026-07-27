'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Search, BookOpen, ExternalLink, Filter } from 'lucide-react';
import { useNavigation } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BookmarkButton } from '@/components/common/BookmarkButton';

interface LawDetailData {
  lawId: number;
  lawNameTh: string;
  lawNameEn: string | null;
  year: string | null;
  category: string | null;
  isLaborLaw: number;
  status: string | null;
  fullText: string | null;
  sourceUrl: string | null;
  notes: string | null;
  krisdikaSysid: string | null;
  lawGoThId: string | null;
  sections: Array<{
    sectionId: number;
    articleKey: string | null;
    sectionNumber: string | null;
    sectionText: string;
    isLaborRelated: number;
    isCancelled: number;
    chapter: string | null;
    notes: string | null;
  }>;
}

export function LawView({ lawId }: { lawId: number }) {
  const { navigate } = useNavigation();
  const [law, setLaw] = useState<LawDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [laborOnly, setLaborOnly] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const q = searchQ.trim();
    const url = `/api/laws?id=${lawId}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error('Law not found');
        return r.json();
      })
      .then(setLaw)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [lawId, searchQ]);

  const visibleSections = (law?.sections || []).filter(s => !laborOnly || s.isLaborRelated === 1);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ name: 'laws' })}
        className="mb-4 text-muted-foreground hover:text-foreground gap-1"
      >
        <ArrowLeft className="h-4 w-4" />
        กลับสู่รายการกฎหมาย
      </Button>

      {loading && <div className="text-center py-20 text-muted-foreground">กำลังโหลด…</div>}
      {error && <div className="text-center py-20 text-destructive">เกิดข้อผิดพลาด: {error}</div>}

      {law && !loading && (
        <>
          {/* Header */}
          <div className="card-premium rounded-2xl p-6 sm:p-8 mb-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {law.isLaborLaw === 1 && (
                    <Badge variant="outline" className="badge-labor">กฎหมายแรงงาน</Badge>
                  )}
                  {law.year && <Badge variant="outline" className="badge-gold">พ.ศ. {law.year}</Badge>}
                  <Badge variant="outline" className="border-border/60 text-muted-foreground">
                    {law.category}
                  </Badge>
                  <BookmarkButton
                    type="law"
                    id={law.lawId}
                    label={law.lawNameTh}
                    url={`/?view=law&id=${law.lawId}`}
                  />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground">
                  {law.lawNameTh}
                </h1>
                {law.lawNameEn && (
                  <p className="text-sm text-muted-foreground mt-1">{law.lawNameEn}</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border/40 text-sm">
              <div>
                <span className="text-muted-foreground">มาตรา:</span>{' '}
                <span className="font-semibold text-gold">{law.sections.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">มาตราแรงงาน:</span>{' '}
                <span className="font-semibold text-gold">
                  {law.sections.filter(s => s.isLaborRelated === 1).length}
                </span>
              </div>
              {law.sourceUrl && (
                <a
                  href={law.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-1 text-xs text-gold hover:underline"
                >
                  ดูที่ law.go.th <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          {/* Search + filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาในมาตราของกฎหมายนี้…"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                className="pl-10 bg-card-soft border-border/60"
              />
            </div>
            <Button
              variant={laborOnly ? 'default' : 'outline'}
              onClick={() => setLaborOnly(v => !v)}
              className={laborOnly ? 'bg-gold text-navy hover:bg-gold/90' : ''}
            >
              <Filter className="h-4 w-4" />
              {laborOnly ? 'แสดงเฉพาะมาตราแรงงาน' : 'ทั้งหมด'}
            </Button>
          </div>

          {/* Sections list */}
          {visibleSections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>ไม่พบมาตราที่ตรงกับเงื่อนไข</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleSections.map(s => (
                <SectionCard key={s.sectionId} section={s} lawNameTh={law.lawNameTh} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SectionCard({
  section,
  lawNameTh,
}: {
  section: LawDetailData['sections'][number];
  lawNameTh: string;
}) {
  const { navigate } = useNavigation();
  return (
    <button
      onClick={() => navigate({ name: 'section', sectionId: section.sectionId })}
      className="card-premium rounded-xl p-5 w-full text-left group cursor-pointer"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className={`flex h-12 min-w-12 px-3 items-center justify-center rounded-lg ${
            section.isLaborRelated === 1
              ? 'bg-gold/15 border border-gold/30'
              : 'bg-card-softer border border-border/40'
          }`}>
            <span className={`text-sm font-bold ${section.isLaborRelated === 1 ? 'text-gold' : 'text-foreground'}`}>
              {section.articleKey || `มาตรา ${section.sectionNumber || '?'}`}
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-relaxed prose-thai text-foreground/90 line-clamp-3 group-hover:text-foreground transition">
            {section.sectionText}
          </p>
          {section.isLaborRelated === 1 && (
            <Badge variant="outline" className="badge-labor mt-2 text-[10px]">แรงงาน</Badge>
          )}
          {section.isCancelled === 1 && (
            <Badge variant="outline" className="mt-2 ml-1 text-[10px] border-destructive/40 text-destructive">
              ยกเลิก
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

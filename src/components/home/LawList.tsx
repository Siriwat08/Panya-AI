'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { useNavigation } from '@/lib/navigation';
import { Badge } from '@/components/ui/badge';
import type { LawSummary } from '@/lib/types';

const CATEGORY_LABEL: Record<string, { th: string; en: string }> = {
  labor: { th: 'กฎหมายแรงงาน', en: 'Labor' },
  civil: { th: 'แพ่งและพาณิชย์', en: 'Civil' },
  criminal: { th: 'อาญา', en: 'Criminal' },
  civil_procedure: { th: 'วิธีพิจารณาแพ่ง', en: 'Civil Procedure' },
  criminal_procedure: { th: 'วิธีพิจารณาอาญา', en: 'Criminal Procedure' },
  land: { th: 'ที่ดิน', en: 'Land' },
  rent: { th: 'เช่าเคหะ', en: 'Rent Control' },
  narcotics: { th: 'ยาเสพติด', en: 'Narcotics' },
  traffic: { th: 'จราจร', en: 'Traffic' },
  other: { th: 'อื่นๆ', en: 'Other' },
};

export function LawList({ laws }: { laws: LawSummary[] }) {
  const { navigate } = useNavigation();
  const [filter, setFilter] = useState<string>('all');

  // Group by category
  const grouped: Record<string, LawSummary[]> = {};
  for (const l of laws) {
    const cat = l.category || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(l);
  }

  const visibleLaws = filter === 'all' ? laws : (grouped[filter] || []);
  const categories = ['all', ...Object.keys(grouped)];

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <div className="mb-6 flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            กฎหมายในระบบ
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            คลิกที่กฎหมายเพื่อดูมาตราทั้งหมด
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map(c => (
            <button type="button" onClick={() => setFilter(c)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition border ${
                filter === c
                  ? 'bg-gold text-navy border-gold'
                  : 'bg-card-soft text-muted-foreground border-border/50 hover:text-foreground hover:border-gold/30'
              }`}
            >
              {c === 'all' ? 'ทั้งหมด' : (CATEGORY_LABEL[c]?.th || c)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleLaws.map(law => (
          <LawCard key={law.lawId} law={law} onClick={() => navigate({ name: 'law', lawId: law.lawId })} />
        ))}
      </div>
    </section>
  );
}

function LawCard({ law, onClick }: { law: LawSummary; onClick: () => void }) {
  const cat = CATEGORY_LABEL[law.category || 'other'] || { th: law.category, en: '' };
  return (
    <button type="button" onClick={onClick}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex flex-wrap gap-1.5">
          {law.isLaborLaw === 1 && (
            <Badge variant="outline" className="badge-labor text-[10px]">แรงงาน</Badge>
          )}
          <Badge variant="outline" className="badge-gold text-[10px]">{cat.th}</Badge>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-gold group-hover:translate-x-1 transition" />
      </div>
      <h3 className="text-sm font-semibold text-foreground leading-snug mb-2 line-clamp-2 group-hover:text-gold transition">
        {law.lawNameTh}
      </h3>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{law.year ? `พ.ศ. ${law.year}` : '—'}</span>
        <div className="flex gap-3">
          <span>{law.sectionCount} มาตรา</span>
          {law.laborSectionCount > 0 && (
            <span className="text-gold">{law.laborSectionCount} แรงงาน</span>
          )}
        </div>
      </div>
    </button>
  );
}

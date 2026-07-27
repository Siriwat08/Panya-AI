'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Scale, Sparkles, BookOpen, Gavel } from 'lucide-react';
import { useNavigation } from '@/lib/navigation';
import type { DashboardStats } from '@/lib/types';

export function Hero({ stats }: { stats: DashboardStats | null }) {
  const { navigate } = useNavigation();

  return (
    <section className="relative overflow-hidden">
      {/* Decorative glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gold/10 rounded-full blur-[120px]" />
        <div className="absolute top-20 right-10 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-16 pb-12 sm:pt-20 sm:pb-16">
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold-soft px-4 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            <span className="text-xs font-medium text-gold tracking-wide">
              ฐานข้อมูลกฎหมายไทย · พร้อม AI ถามตอบ
            </span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-center text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]">
          <span className="text-foreground">เข้าใจกฎหมายไทย</span>
          <br />
          <span className="text-gradient-gold">ได้ง่าย อ้างอิงได้จริง</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-center text-base sm:text-lg text-muted-foreground leading-relaxed">
          รวบรวมกฎหมายแรงงาน ป.พ.พ. ป.อ. และคำพิพากษาศาลฎีกา
          ค้นหาเจอไว อ่านรู้เรื่อง และถาม AI พร้อมอ้างอิงมาตรา/ฎีกาที่เกี่ยวข้อง
        </p>

        {/* CTA */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Button
            size="lg"
            onClick={() => navigate({ name: 'ask' })}
            className="btn-glow bg-gradient-to-r from-gold to-gold/80 text-navy hover:from-gold/90 hover:to-gold/70 font-semibold gap-2"
          >
            <Sparkles className="h-4 w-4" />
            ถามคำถามกฎหมาย
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate({ name: 'laws' })}
            className="border-border/60 bg-card/50 backdrop-blur-sm hover:bg-accent/50 gap-2"
          >
            <BookOpen className="h-4 w-4" />
            สำรวจกฎหมายทั้งหมด
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats Strip */}
        {stats && <StatsStrip stats={stats} />}
      </div>
    </section>
  );
}

function StatsStrip({ stats }: { stats: DashboardStats }) {
  const items = [
    { label: 'กฎหมาย', labelEn: 'Laws', value: stats.totalLaws, icon: BookOpen },
    { label: 'มาตรา', labelEn: 'Sections', value: stats.totalSections, icon: Scale },
    { label: 'ฎีกาแรงงาน', labelEn: 'Labor judgments', value: stats.totalLaborJudgments, icon: Gavel },
    { label: 'มาตราแรงงาน', labelEn: 'Labor sections', value: stats.totalLaborSections, icon: Scale },
  ];
  return (
    <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      {items.map(it => {
        const Icon = it.icon;
        return (
          <div
            key={it.label}
            className="card-premium rounded-xl p-4 sm:p-5 text-center"
          >
            <div className="flex justify-center mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-soft">
                <Icon className="h-4 w-4 text-gold" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gradient-gold tabular-nums">
              {it.value.toLocaleString('th-TH')}
            </div>
            <div className="text-xs sm:text-sm font-medium text-foreground mt-0.5">{it.label}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{it.labelEn}</div>
          </div>
        );
      })}
    </div>
  );
}

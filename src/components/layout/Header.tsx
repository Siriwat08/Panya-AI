'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Scale, Search, Bookmark, MessageSquare, Home, BookOpen, Menu, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigation } from '@/lib/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { view: { name: 'home' } as const, label: 'หน้าแรก', labelEn: 'Home', icon: Home },
  { view: { name: 'laws' } as const, label: 'กฎหมาย', labelEn: 'Laws', icon: BookOpen },
  { view: { name: 'judgments' } as const, label: 'คำพิพากษา', labelEn: 'Judgments', icon: Scale },
  { view: { name: 'search' } as const, label: 'ค้นหา', labelEn: 'Search', icon: Search },
  { view: { name: 'ask' } as const, label: 'ถาม AI', labelEn: 'Ask AI', icon: MessageSquare },
  { view: { name: 'templates' } as const, label: 'เอกสาร', labelEn: 'Templates', icon: FileText },
  { view: { name: 'bookmarks' } as const, label: 'บันทึก', labelEn: 'Bookmarks', icon: Bookmark },
];

export function Header() {
  const { getView, navigate } = useNavigation();
  const [currentView, setCurrentView] = useState<{ name: string }>({ name: 'home' });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const update = () => setCurrentView(getView() as any);
    update();
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, [getView]);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <button
          onClick={() => navigate({ name: 'home' })}
          className="flex items-center gap-2.5 group"
          aria-label="Panya-AI"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-lg bg-gold/30 blur-md group-hover:bg-gold/50 transition" />
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-gold/70 text-navy">
              <Scale className="h-5 w-5" strokeWidth={2.5} />
            </div>
          </div>
          <div className="flex flex-col items-start leading-none">
            <span className="text-base font-bold tracking-tight">
              <span className="text-gradient-gold">ปัญญา AI</span>
            </span>
            <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Panya-AI</span>
          </div>
        </button>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = currentView.name === item.view.name;
            return (
              <Button
                key={item.view.name}
                variant="ghost"
                size="sm"
                onClick={() => navigate(item.view)}
                className={cn(
                  'gap-2 text-sm font-medium',
                  isActive
                    ? 'bg-gold-soft text-gold hover:bg-gold-soft hover:text-gold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </nav>

        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          onClick={() => setMobileOpen(v => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 py-3 grid grid-cols-2 gap-2">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = currentView.name === item.view.name;
              return (
                <Button
                  key={item.view.name}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigate(item.view);
                    setMobileOpen(false);
                  }}
                  className={cn(
                    'justify-start gap-2 text-sm font-medium',
                    isActive
                      ? 'bg-gold-soft text-gold hover:bg-gold-soft hover:text-gold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  const [footerStats, setFooterStats] = useState({totalLaws: 78, totalSections: 8507, totalJudgments: 514, totalRegulations: 615, totalTemplates: 63});

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => setFooterStats(d))
      .catch(() => {});
  }, []);

  return (
    <footer className="mt-auto border-t border-border/60 bg-card-soft/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-gold to-gold/70 text-navy">
                <Scale className="h-4 w-4" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-bold text-gradient-gold">ปัญญา AI</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              ฐานข้อมูลกฎหมายไทยสำหรับการศึกษา รวบรวมจากสำนักงานคณะกรรมการกฤษฎีกา, PyThaiNLP,
              กระทรวงแรงงาน และศาลฎีกา — ใช้ภายใต้เงื่อนไขของแต่ละแหล่งข้อมูล
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gold mb-3">ข้อมูลในระบบ</h4>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li>กฎหมาย {footerStats.totalLaws} ฉบับ · {footerStats.totalSections.toLocaleString("th-TH")} มาตรา</li>
              <li>คำพิพากษาฎีกา {footerStats.totalJudgments} เรื่อง</li>
              <li>อนุบัญญัติ {footerStats.totalRegulations} ฉบับ · เทมเพลต {footerStats.totalTemplates} ฉบับ</li>
              <li>AI RAG พร้อมอ้างอิงมาตรา/ฎีกา</li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gold mb-3">ข้อควรระวัง</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              คำตอบจาก AI ให้ข้อมูลเพื่อการศึกษา ไม่ใช่คำแนะนำทางกฎหมาย
              คำพิพากษาบางส่วนมาจาก TSCC Dataset (ใช้วิจัยเท่านั้น)
              สำหรับกรณีจริง โปรดปรึกษาทนายความ
            </p>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-border/40 text-center">
          <p className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} Panya-AI · Built for educational use ·
            Data sources: law.go.th · PyThaiNLP · deka.in.th · ops.mol.go.th · TSCC (academic)
          </p>
        </div>
      </div>
    </footer>
  );
}

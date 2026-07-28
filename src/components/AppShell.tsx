'use client';

import { useEffect, useState } from 'react';
import { Header, Footer } from '@/components/layout/Header';
import { HomeView } from '@/components/home/HomeView';
import { LawsView } from '@/components/law/LawsView';
import { LawView } from '@/components/law/LawView';
import { SectionView } from '@/components/law/SectionView';
import { JudgmentsView } from '@/components/judgment/JudgmentsView';
import { JudgmentView } from '@/components/judgment/JudgmentView';
import { SearchView } from '@/components/search/SearchView';
import { AskView } from '@/components/chat/AskView';
import { BookmarksView } from '@/components/common/BookmarksView';
import { TemplatesView } from '@/components/templates/TemplatesView';
import type { View } from '@/lib/types';

function parseView(): View {
  if (typeof window === 'undefined') return { name: 'home' };
  const params = new URLSearchParams(window.location.search);
  const v = params.get('view');
  const id = params.get('id');
  const q = params.get('q');
  const type = params.get('type') as any;

  switch (v) {
    case 'laws': return { name: 'laws' };
    case 'law': return { name: 'law', lawId: id ? parseInt(id, 10) : 0 };
    case 'section': return { name: 'section', sectionId: id ? parseInt(id, 10) : 0 };
    case 'judgments': return { name: 'judgments' };
    case 'judgment': return { name: 'judgment', judgmentId: id ? parseInt(id, 10) : 0 };
    case 'search': return { name: 'search', q: q || undefined, type: type || 'all' };
    case 'bookmarks': return { name: 'bookmarks' };
    case 'templates': return { name: 'templates' };
    case 'ask': return { name: 'ask' };
    default: return { name: 'home' };
  }
}

export function AppShell() {
  const [view, setView] = useState<View>({ name: 'home' });

  useEffect(() => {
    const update = () => {
      setView(parseView());
      // Scroll to top on view change (except when only query changes for search)
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    update();
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {view.name === 'home' && <HomeView />}
        {view.name === 'laws' && <LawsView />}
        {view.name === 'law' && view.lawId > 0 && <LawView lawId={view.lawId} />}
        {view.name === 'law' && view.lawId <= 0 && <InvalidId message="ไม่พบกฎหมาย" />}
        {view.name === 'section' && view.sectionId > 0 && <SectionView sectionId={view.sectionId} />}
        {view.name === 'section' && view.sectionId <= 0 && <InvalidId message="ไม่พบมาตรา" />}
        {view.name === 'judgments' && <JudgmentsView />}
        {view.name === 'judgment' && view.judgmentId > 0 && <JudgmentView judgmentId={view.judgmentId} />}
        {view.name === 'judgment' && view.judgmentId <= 0 && <InvalidId message="ไม่พบคำพิพากษา" />}
        {view.name === 'search' && (
          <SearchView initialQ={view.q} initialType={view.type as any} />
        )}
        {view.name === 'ask' && <AskView />}
        {view.name === 'bookmarks' && <BookmarksView />}
        {view.name === 'templates' && <TemplatesView />}
      </main>
      <Footer />
    </div>
  );
}

function InvalidId({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <p className="text-destructive">{message}</p>
    </div>
  );
}

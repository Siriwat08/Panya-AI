'use client';

import { ArrowRight, Sparkles, MessageSquare } from 'lucide-react';
import { useNavigation } from '@/lib/navigation';
import { Button } from '@/components/ui/button';

const SAMPLE_QUESTIONS = [
  'นายจ้างเลิกจ้างโดยไม่เตือนล่วงหน้า ลูกจ้างมีสิทธิอะไรบ้าง?',
  'ค่าจ้างล่วงเวลาคำนวณอย่างไร และต้องจ่ายในอัตราใด?',
  'ลูกจ้างมีบุริมสิทธิ์อย่างไรเมื่อนายจ้างล้มละลาย?',
  'การเลิกจ้างเพราะลูกจ้างอายุ 60 ปี ถือเป็นการเลิกจ้างที่ชอบหรือไม่?',
];

export function AskCta() {
  const { navigate } = useNavigation();
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
      <div className="card-premium rounded-2xl overflow-hidden">
        <div className="relative p-6 sm:p-10">
          {/* Decorative */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-gold-soft border border-gold/30 px-3 py-1 mb-4">
                <Sparkles className="h-3.5 w-3.5 text-gold" />
                <span className="text-xs font-medium text-gold">AI RAG · อ้างอิงมาตรา/ฎีกา</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-3 leading-tight">
                ถามคำถามกฎหมาย<br />
                <span className="text-gradient-gold">เป็นภาษาธรรมดา</span>
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                AI ของเราค้นหามาตราและคำพิพากษาฎีกาที่เกี่ยวข้องจากฐานข้อมูลจริง
                แล้วตอบพร้อมอ้างอิงเป็นหมายเลข [1], [2] เพื่อให้คุณตรวจสอบได้
                ไม่ invent มาตราที่ไม่มีอยู่จริง
              </p>
              <Button
                onClick={() => navigate({ name: 'ask' })}
                className="btn-glow bg-gradient-to-r from-gold to-gold/80 text-navy hover:from-gold/90 hover:to-gold/70 font-semibold gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                เริ่มถามคำถาม
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">ตัวอย่างคำถาม</p>
              {SAMPLE_QUESTIONS.map((q, i) => (
                <button type="button" onClick navigate({ name: 'ask' })}
                  className="w-full text-left px-4 py-3 rounded-lg bg-card-softer border border-border/40 hover:border-gold/30 hover:bg-accent/30 transition text-sm text-foreground/90"
                >
                  <span className="text-gold mr-2">›</span>
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

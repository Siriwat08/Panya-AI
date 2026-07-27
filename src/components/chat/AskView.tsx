'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, Sparkles, AlertTriangle, ChevronRight, ExternalLink, Trash2 } from 'lucide-react';
import { useNavigation } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Citation {
  index: number;
  type: 'section' | 'judgment';
  id: number;
  label: string;
  ref: string;
  snippet: string;
  url: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  retrievedChunks?: number;
  error?: boolean;
}

const SAMPLE_QUESTIONS = [
  'นายจ้างเลิกจ้างโดยไม่เตือนล่วงหน้า ลูกจ้างมีสิทธิอะไรบ้าง?',
  'ค่าจ้างล่วงเวลาคำนวณอย่างไร?',
  'ลูกจ้างมีบุริมสิทธิ์เมื่อนายจ้างล้มละลายหรือไม่?',
  'การเลิกจ้างเพราะลูกจ้างอายุ 60 ปีถือเป็นการเลิกจ้างที่ชอบหรือไม่?',
  'นายจ้างหยุดกิจการ ต้องจ่ายค่าชดเชยอย่างไร?',
];

export function AskView() {
  const { navigate } = useNavigation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [laborOnly, setLaborOnly] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const ask = async (question: string) => {
    if (!question.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Build history (exclude current question, last 4 messages)
    const history = messages.slice(-4).map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history, laborOnly }),
      });
      const data = await res.json();

      if (data.error) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: `ขออภัย เกิดข้อผิดพลาด: ${data.error}\n\n${data.message || ''}\n\nอย่างไรก็ตาม ผมค้นพบ ${data.retrievedChunks || 0} มาตรา/ฎีกาที่เกี่ยวข้อง คุณสามารถดู citations ด้านล่างเพื่ออ่านด้วยตัวเอง`,
            citations: data.citations || [],
            retrievedChunks: data.retrievedChunks,
            error: true,
          },
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: data.answer,
            citations: data.citations || [],
            retrievedChunks: data.retrievedChunks,
          },
        ]);
      }
    } catch (e: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `เกิดข้อผิดพลาดในการเชื่อมต่อ: ${e.message || 'Unknown error'}`,
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-soft border border-gold/30">
            <Sparkles className="h-4 w-4 text-gold" />
          </div>
          <h1 className="text-2xl font-bold">ถาม AI ว่าด้วยกฎหมายไทย</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          AI ค้นหามาตราและคำพิพากษาฎีกาที่เกี่ยวข้องจากฐานข้อมูลจริง แล้วตอบพร้อมอ้างอิง [N]
          ห้ามให้คำแนะนำทางกฎหมายเจาะจง — ใช้เพื่อการศึกษาเท่านั้น
        </p>
      </div>

      {/* Labor-only toggle */}
      <div className="mb-4 flex items-center gap-2 text-xs">
        <button
          onClick={() => setLaborOnly(v => !v)}
          className={`px-3 py-1.5 rounded-full font-medium transition border ${
            laborOnly
              ? 'bg-gold/15 text-gold border-gold/30'
              : 'bg-card-soft text-muted-foreground border-border/50'
          }`}
        >
          {laborOnly ? '✓ ' : ''}โฟกัสเฉพาะกฎหมายแรงงาน
        </button>
        <span className="text-muted-foreground">
          {laborOnly ? 'ค้นหาเฉพาะมาตรา/ฎีกาแรงงาน' : 'ค้นหาในทุกกฎหมาย'}
        </span>
      </div>

      {/* Messages */}
      <div className="space-y-4 mb-4 min-h-[300px]">
        {messages.length === 0 && (
          <div className="card-premium rounded-2xl p-8 text-center">
            <Sparkles className="h-10 w-10 mx-auto mb-4 text-gold/70" />
            <h2 className="text-lg font-semibold mb-2">ลองถามคำถามเหล่านี้</h2>
            <p className="text-sm text-muted-foreground mb-6">
              คลิกที่คำถามเพื่อเริ่มต้น หรือพิมพ์คำถามของคุณเองด้านล่าง
            </p>
            <div className="grid gap-2 text-left">
              {SAMPLE_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => ask(q)}
                  className="px-4 py-2.5 rounded-lg bg-card-softer border border-border/40 hover:border-gold/30 hover:bg-accent/30 transition text-sm text-foreground/90"
                >
                  <span className="text-gold mr-2">›</span>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} onCitationClick={(url) => {
            // Parse url like /?view=section&id=123
            const params = new URLSearchParams(url.split('?')[1] || '');
            const view = params.get('view');
            const id = params.get('id');
            if (view === 'section' && id) navigate({ name: 'section', sectionId: parseInt(id, 10) });
            else if (view === 'judgment' && id) navigate({ name: 'judgment', judgmentId: parseInt(id, 10) });
          }} />
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="card-premium rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-gold" />
              <span className="text-sm text-muted-foreground">กำลังค้นหามาตรา/ฎีกาที่เกี่ยวข้อง…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Clear button */}
      {messages.length > 0 && (
        <div className="mb-3 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMessages([])}
            className="text-xs text-muted-foreground hover:text-destructive gap-1"
          >
            <Trash2 className="h-3.5 w-3.5" />
            ล้างการสนทนา
          </Button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={onSubmit} className="sticky bottom-4">
        <div className="card-premium rounded-2xl p-2 flex gap-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e as any);
              }
            }}
            placeholder="ถามคำถามกฎหมาย… (Enter เพื่อส่ง, Shift+Enter ขึ้นบรรทัดใหม่)"
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm px-3 py-2 max-h-32"
            disabled={loading}
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-gold text-navy hover:bg-gold/90 flex-shrink-0"
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground/70 text-center mt-2">
          AI อ้างอิงเฉพาะข้อมูลในฐานข้อมูล · ไม่ใช่คำแนะนำทางกฎหมาย · TSCC academic use only
        </p>
      </form>
    </div>
  );
}

function MessageBubble({
  msg,
  onCitationClick,
}: {
  msg: ChatMessage;
  onCitationClick: (url: string) => void;
}) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-gradient-to-br from-gold to-gold/80 text-navy rounded-br-md'
            : msg.error
            ? 'card-premium border-destructive/30 rounded-bl-md'
            : 'card-premium rounded-bl-md'
        }`}
      >
        {/* Content */}
        <div className="text-sm prose-thai whitespace-pre-wrap leading-relaxed">{msg.content}</div>

        {/* Citations */}
        {!isUser && msg.citations && msg.citations.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/40">
            <div className="text-xs uppercase tracking-wider text-gold mb-2 font-semibold">
              อ้างอิง ({msg.citations.length})
            </div>
            <div className="grid gap-1.5">
              {msg.citations.map(c => (
                <button
                  key={c.index}
                  onClick={() => onCitationClick(c.url)}
                  className="flex items-start gap-2 text-left p-2 rounded-lg bg-card-softer hover:bg-accent/30 border border-border/30 hover:border-gold/30 transition group"
                >
                  <Badge variant="outline" className="badge-gold text-[10px] flex-shrink-0">
                    [{c.index}]
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground group-hover:text-gold transition flex items-center gap-1">
                      {c.type === 'judgment' ? <Scale2Icon /> : <BookIcon />}
                      <span className="truncate">{c.label}</span>
                      <ChevronRight className="h-3 w-3 ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition" />
                    </div>
                    <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{c.snippet}</div>
                  </div>
                </button>
              ))}
            </div>
            {msg.retrievedChunks !== undefined && (
              <div className="mt-2 text-[10px] text-muted-foreground/70">
                ค้นพบ {msg.retrievedChunks} ชิ้นข้อมูลที่เกี่ยวข้องจากฐานข้อมูล
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Tiny inline icons to avoid import bloat in map
function BookIcon() {
  return (
    <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}
function Scale2Icon() {
  return (
    <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
    </svg>
  );
}

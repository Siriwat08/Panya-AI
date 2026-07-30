'use client';
import { useState } from 'react';
import { ArrowLeft, Shield, AlertTriangle, CheckCircle, Loader2, FileSearch } from 'lucide-react';
import { useNavigation } from '@/lib/navigation';
import { Button } from '@/components/ui/button';

const SAMPLE = `นายจ้างมีสิทธิเลิกจ้างได้ตลอดเวลาโดยไม่ต้องบอกกล่าวล่วงหน้า
ลูกจ้างตกลงทำงานล่วงเวลาโดยไม่ขอค่าล่วงเวลา
นายจ้างมีสิทธิหักเงินเดือนเป็นค่าปรับได้ตามดุลยพินิจ
ลูกจ้างไม่สามารถลาออกได้ภายใน 2 ปีแรก
การลดค่าจ้างเป็นดุลยพินิจของนายจ้าง`;

interface AnalysisResult {
  summary: string;
  citations: Array<{ index: number; type: string; id: number; label: string; ref: string; snippet: string; url: string }>;
}

export function ContractAnalysisView() {
  const { navigate } = useNavigation();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `วิเคราะห์สัญญาต่อไปนี้ในฐานะที่ปรึกษาฝั่งนายจ้าง ระบุข้อความที่ผิดกฎหมายแรงงาน พร้อมอ้างอิงมาตรา:\n\n${text}`,
          history: [],
          laborOnly: true,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult({
        summary: data.answer || 'ไม่สามารถวิเคราะห์ได้',
        citations: data.citations || [],
      });
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <Button type="button" variant="ghost" size="sm" onClick={() => navigate({ name: 'home' })} className="mb-4">
        <ArrowLeft className="h-4 w-4" /> กลับ
      </Button>
      <div className="flex items-center gap-2 mb-2">
        <FileSearch className="h-6 w-6 text-gold" />
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'var(--font-ibm-plex-serif)' }}>วิเคราะห์สัญญา</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">วางข้อความสัญญา → AI ตรวจหาข้อที่ผิดกฎหมายแรงงาน พร้อมอ้างอิงมาตรา</p>

      <div className="card-premium rounded-xl p-6 mb-6">
        <label className="block text-sm font-medium mb-2">ข้อความสัญญา / เงื่อนไขการจ้าง</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="วางข้อความสัญญาที่นี่..."
          rows={8}
          className="w-full px-4 py-3 text-sm rounded-lg border border-border/50 bg-card-soft outline-none focus:border-gold/40 resize-y"
        />
        <div className="flex items-center justify-between mt-4">
          <button type="button" onClick={() => setText(SAMPLE)} className="text-xs text-gold hover:text-gold/80 transition">
            ลองตัวอย่างสัญญาที่มีปัญหา →
          </button>
          <Button type="button" onClick={analyze} disabled={loading || !text.trim()} className="bg-gold text-navy gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            {loading ? 'กำลังวิเคราะห์...' : 'วิเคราะห์สัญญา'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="card-premium rounded-xl p-6 mb-4 border-destructive/30">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-5 w-5 text-red-500" /><h2 className="text-lg font-semibold">เกิดข้อผิดพลาด</h2></div>
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground mt-2">ลองวางข้อความสั้นๆ แล้วกดวิเคราะห์ใหม่</p>
        </div>
      )}

      {loading && (
        <div className="card-premium rounded-xl p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gold mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">AI กำลังวิเคราะห์สัญญา... (อาจใช้เวลา 10-30 วินาที)</p>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-4">
          {result.citations.length > 0 && (
            <div className="card-premium rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4"><AlertTriangle className="h-5 w-5 text-red-500" /><h2 className="text-lg font-semibold">จุดเสี่ยง ({result.citations.length})</h2></div>
              <div className="space-y-2">
                {result.citations.map((c, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${i < 2 ? 'bg-red-500/10 border-red-500/30' : 'bg-orange-500/10 border-orange-500/30'}`}>
                    <div className="flex items-start gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${i < 2 ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}`}>{i < 2 ? 'ร้ายแรง' : 'ปานกลาง'}</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{c.label || c.ref}</div>
                        <div className="text-xs text-muted-foreground mt-1">{c.snippet}</div>
                        <div className="text-[11px] text-gold mt-1">📎 {c.ref}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="card-premium rounded-xl p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gold mb-3">คำวิเคราะห์ AI</h2>
            <div className="text-sm prose-thai whitespace-pre-wrap leading-relaxed">{result.summary}</div>
          </div>
          <div className="card-premium rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3"><CheckCircle className="h-5 w-5 text-green-600" /><h2 className="text-lg font-semibold">คำแนะนำ</h2></div>
            <ul className="space-y-2">
              {['แก้ไขข้อที่ผิดกฎหมายก่อนลงนาม', 'ปรึกษาทนายความตรวจสอบขั้นสุดท้าย', 'เก็บหลักฐานการแก้ไขทุกครั้ง'].map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm"><span className="text-gold font-bold">{i + 1}.</span><span>{r}</span></li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

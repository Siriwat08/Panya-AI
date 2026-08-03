'use client';
import { useState, useRef, useCallback } from 'react';
import { Shield, AlertTriangle, CheckCircle, Loader2, FileSearch, Upload, FileText, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/common/BackButton';
import { extractTextFromPDF, formatFileSize } from '@/lib/pdf-extract';

const SAMPLE = `นายจ้างมีสิทธิเลิกจ้างได้ตลอดเวลาโดยไม่ต้องบอกกล่าวล่วงหน้า
ลูกจ้างตกลงทำงานล่วงเวลาโดยไม่ขอค่าล่วงเวลา
นายจ้างมีสิทธิหักเงินเดือนเป็นค่าปรับได้ตามดุลยพินิจ
ลูกจ้างไม่สามารถลาออกได้ภายใน 2 ปีแรก
การลดค่าจ้างเป็นดุลยพินิจของนายจ้าง`;

interface AnalysisResult {
  summary: string;
  citations: Array<{ index: number; type: string; id: number; label: string; ref: string; snippet: string; url: string }>;
}

interface PDFInfo {
  fileName: string;
  fileSize: number;
  pageCount: number;
}

export function ContractAnalysisView() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfInfo, setPdfInfo] = useState<PDFInfo | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle PDF file — extract text client-side
  const handlePDFFile = useCallback(async (file: File) => {
    setPdfLoading(true);
    setError(null);
    setPdfProgress('กำลังโหลด PDF...');
    setResult(null);

    try {
      const result = await extractTextFromPDF(file, (currentPage, totalPages) => {
        setPdfProgress(`กำลังอ่านหน้า ${currentPage}/${totalPages}...`);
      });

      setText(result.text);
      setPdfInfo({
        fileName: result.fileName,
        fileSize: result.fileSize,
        pageCount: result.pageCount,
      });
      setPdfProgress(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'ไม่สามารถอ่าน PDF ได้';
      setError(message);
      setPdfInfo(null);
      setPdfProgress(null);
    } finally {
      setPdfLoading(false);
    }
  }, []);

  // File input change
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePDFFile(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  // Drag & drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handlePDFFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  // Clear PDF + text
  const clearAll = () => {
    setText('');
    setPdfInfo(null);
    setResult(null);
    setError(null);
  };

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <BackButton label="ย้อนกลับ" />
      <div className="flex items-center gap-2 mb-2">
        <FileSearch className="h-6 w-6 text-gold" />
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'var(--font-ibm-plex-serif)' }}>วิเคราะห์สัญญา</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-4">อัปโหลด PDF หรือวางข้อความสัญญา → AI ตรวจหาข้อที่ผิดกฎหมายแรงงาน พร้อมอ้างอิงมาตรา</p>

      {/* Privacy notice */}
      <div className="card-premium rounded-lg p-3 mb-4 border-blue-500/20 bg-blue-500/5">
        <p className="text-xs text-muted-foreground flex items-start gap-2">
          <Shield className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <span>
            <strong> privacy 100%</strong> — ไฟล์ PDF ถูกประมวลผลในเบราว์เซอร์ของคุณ
            ไม่มีการส่งไฟล์ไปเซิร์ฟเวอร์ ไม่มีการจัดเก็บ ข้อมูลจะหายไปเมื่อปิดหน้านี้
          </span>
        </p>
      </div>

      {/* PDF upload zone + text area */}
      <div className="card-premium rounded-xl p-6 mb-6">
        {/* PDF upload drop zone */}
        {!pdfInfo && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors mb-4 ${
              dragOver ? 'border-gold bg-gold/5' : 'border-border/50 hover:border-gold/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className={`h-10 w-10 mx-auto mb-3 ${dragOver ? 'text-gold' : 'text-muted-foreground'}`} />
            <p className="text-sm font-medium mb-1">ลากไฟล์ PDF มาวางที่นี่ หรือ</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-gold hover:text-gold/80 transition underline"
              disabled={pdfLoading}
            >
              เลือกไฟล์จากเครื่อง
            </button>
            <p className="text-xs text-muted-foreground mt-2">รองรับ PDF ขนาดไม่เกิน 10MB</p>
          </div>
        )}

        {/* PDF loading indicator */}
        {pdfLoading && (
          <div className="flex items-center justify-center gap-3 py-6">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
            <span className="text-sm text-muted-foreground">{pdfProgress || 'กำลังประมวลผล...'}</span>
          </div>
        )}

        {/* PDF info bar (after extraction) */}
        {pdfInfo && !pdfLoading && (
          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <FileText className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{pdfInfo.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {pdfInfo.pageCount} หน้า · {formatFileSize(pdfInfo.fileSize)} · แยกข้อความแล้ว
              </p>
            </div>
            <button
              type="button"
              onClick={clearAll}
              className="text-muted-foreground hover:text-red-500 transition flex-shrink-0"
              title="ล้างข้อมูล"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Text area — shows extracted text or manual paste */}
        {(pdfInfo || !pdfLoading) && (
          <>
            <label htmlFor="contract-text" className="block text-sm font-medium mb-2">
              {pdfInfo ? 'ข้อความที่แยกจาก PDF (แก้ไขได้)' : 'ข้อความสัญญา / เงื่อนไขการจ้าง'}
            </label>
            <textarea
              id="contract-text"
              value={text}
              onChange={e => {
                setText(e.target.value);
                if (pdfInfo && e.target.value !== text) {
                  // User edited the text after PDF extraction — keep pdfInfo but note it's edited
                }
              }}
              placeholder={pdfInfo ? 'ข้อความจาก PDF จะปรากฏที่นี่...' : 'วางข้อความสัญญาที่นี่ หรืออัปโหลด PDF ด้านบน...'}
              rows={8}
              className="w-full px-4 py-3 text-sm rounded-lg border border-border/50 bg-card-soft outline-none focus:border-gold/40 resize-y"
            />
            <div className="flex items-center justify-between mt-4">
              <button type="button" onClick={() => { clearAll(); setText(SAMPLE); }} className="text-xs text-gold hover:text-gold/80 transition">
                ลองตัวอย่างสัญญาที่มีปัญหา →
              </button>
              <Button type="button" onClick={analyze} disabled={loading || !text.trim()} className="bg-gold text-navy gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                {loading ? 'กำลังวิเคราะห์...' : 'วิเคราะห์สัญญา'}
              </Button>
            </div>
          </>
        )}
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
                  <div key={`flag-${c.type}-${c.id}`} className={`p-3 rounded-lg border ${i < 2 ? 'bg-red-500/10 border-red-500/30' : 'bg-orange-500/10 border-orange-500/30'}`}>
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
                <li key={`rec-${i}`} className="flex items-start gap-2 text-sm"><span className="text-gold font-bold">{i + 1}.</span><span>{r}</span></li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

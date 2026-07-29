import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { retrieveRelevant, buildContext, buildCitations } from '@/lib/rag';
import { createChatCompletion } from '@/lib/zai-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SYSTEM_PROMPT = `คุณคือ "Legal Strategist & Labor Law Expert" (นักกลยุทธ์กฎหมายและผู้เชี่ยวชาญด้านแรงงานสัมพันธ์) ประจำ "หจก.เผ่าปัญญา ทรานสปอร์ต"
คุณไม่ใช่แค่ HR ทั่วไป แต่คุณคือที่ปรึกษาที่เน้น "การบริหารความเสี่ยงและปกป้องผลประโยชน์ของนายจ้าง" ภายใต้กรอบของกฎหมาย
ภารกิจของคุณคือการปิดช่องโหว่ทางกฎหมาย จัดการข้อพิพาทที่ซับซ้อน และสร้างระบบเอกสารที่รัดกุมเพื่อรับมือกับการฟ้องร้องจากพนักงานที่ "หัวหมอ" หรือฉวยโอกาส

# Knowledge Base & Legal Framework
คุณต้องให้คำแนะนำโดยอ้างอิงหลักกฎหมายไทยอย่างเคร่งครัด:
1. พ.ร.บ. คุ้มครองแรงงาน พ.ศ. 2541: เน้นมาตรา 118, 119 (เลิกจ้าง), 76 (หักค่าจ้าง), เวลาทำงานพนักงานขับรถ
2. ประมวลกฎหมายแพ่งและพาณิชย์: แยกเด็ดขาดระหว่าง "จ้างแรงงาน" (ม.575 - ลูกจ้างประจำ) กับ "จ้างทำของ" (ม.587 - รถร่วม/Outsource)
3. พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) พ.ศ. 2562: การใช้ GPS และกล้องหน้ารถ
4. พ.ร.บ. แรงงานสัมพันธ์ พ.ศ. 2518 และ พ.ร.บ. ความปลอดภัยฯ (จป.) พ.ศ. 2554

# Core Responsibilities & Strategy

## 1. การบริหารสัญญาจ้างและปิดช่องโหว่ (Contract Strategy)
- แยกสถานะนิติสัมพันธ์: ทุกคำแนะนำต้องวิเคราะห์ก่อนว่าเป็น "ลูกจ้าง" หรือ "ผู้รับเหมา (รถร่วม)" อย่าให้เกิด "นิติกรรมอำพราง"
- การป้องกัน: ร่างสัญญาที่ระบุความเป็นอิสระของผู้รับเหมาช่วงให้ชัดเจน (ไม่มีอำนาจบังคับบัญชา, จ่ายผลตอบแทนตามผลงานไม่ใช่เวลาทำงาน)

## 2. การจัดการวินัยและการเลิกจ้าง (Discipline & Termination)
- Zero Tolerance on Corruption: ความผิดฐานทุจริต (ขโมยน้ำมัน, บิลผี) แนะนำการรวบรวมพยานเพื่อเลิกจ้างโดย "ไม่จ่ายค่าชดเชย" ตามมาตรา 119
- Warning Letters: ร่างหนังสือเตือนที่ระบุรายละเอียดความผิด วันเวลา สถานที่ กฎระเบียบที่ฝ่าฝืน
- Safety Violations: ละเลยความปลอดภัย (ขับเร็ว, ถอด GPS) ถือเป็นความผิดร้ายแรง

## 3. เทคโนโลยีและการควบคุม (PDPA & Monitoring)
- ใช้ข้อมูล GPS และกล้องหน้ารถเป็นหลักฐานความผิด โดยไม่ละเมิด PDPA

# Operational Guidelines
- Tone: เด็ดขาด, เป็นทางการ, รอบคอบ, ยึดข้อเท็จจริง
- Warning Blocks: หากพบความเสี่ยงที่บริษัทอาจแพ้คดี ให้ใส่ ⚠️ RISK ALERT พร้อมระบุจุดอ่อน
- No Ambiguity: ห้ามตอบกำกวม หากกฎหมายไม่ชัดเจน ให้แนะนำทางเลือกที่ "ความเสี่ยงต่ำที่สุด" สำหรับนายจ้าง
- ตอบเป็นภาษาไทยเท่านั้น
- อ้างอิงมาตรา/ฎีกาจาก context ที่ให้เท่านั้น ใส่เลขอ้างอิง [N]

# Output Structure
1. บทวิเคราะห์ทางกฎหมาย: อ้างอิงมาตราที่เกี่ยวข้อง [N]
2. คำแนะนำเชิงกลยุทธ์: สิ่งที่บริษัทควรทำทันที
3. ร่างเอกสาร/คำพูด (ถ้ามี): ตัวอย่างข้อความในสัญญาหรือหนังสือเตือน
4. จุดเสี่ยงที่ต้องระวัง (Risk Check): สิ่งที่อาจทำให้บริษัทเสียเปรียบ พร้อม ⚠️ RISK ALERT หากพบความเสี่ยงสูง`;

interface AskBody {
  question: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  laborOnly?: boolean;
}

export async function POST(req: NextRequest) {
  let body: AskBody;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const question = (body.question || '').trim();
  if (!question) return NextResponse.json({ error: 'question required' }, { status: 400 });
  if (question.length > 2000) return NextResponse.json({ error: 'too long' }, { status: 400 });

  const hits = await retrieveRelevant(question, { topK: 10, laborOnly: body.laborOnly });
  const context = buildContext(hits);
  const citations = buildCitations(hits);

  const userMsg = `คำถามจากนายจ้าง (หจก.เผ่าปัญญา ทรานสปอร์ต): ${question}

ข้อมูลอ้างอิงจากฐานข้อมูลกฎหมายไทย Panya-AI:
${context}

กรุณาวิเคราะห์และตอบในฐานะ Legal Strategist ฝั่งนายจ้าง อ้างอิง [N]`;

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];
  if (body.history && Array.isArray(body.history)) {
    for (const m of body.history.slice(-4)) {
      if (m.role === 'user' || m.role === 'assistant') messages.push({ role: m.role, content: m.content });
    }
  }
  messages.push({ role: 'user', content: userMsg });

  try {
    const { content: aiContent, raw } = await createChatCompletion(messages);
    const content = aiContent || `ขออภัย ไม่สามารถสร้างคำตอบได้`;
    return NextResponse.json({ answer: content, citations, retrievedChunks: hits.length });
  } catch (e: any) {
    console.error('AI failed:', e);
    return NextResponse.json({ error: 'AI service error', message: e?.message || '', citations, retrievedChunks: hits.length }, { status: 500 });
  }
}

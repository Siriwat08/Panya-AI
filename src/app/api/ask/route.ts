import { NextRequest, NextResponse } from 'next/server';
import { retrieveRelevant, buildContext, buildCitations } from '@/lib/rag';
import { createChatCompletion } from '@/lib/zai-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Lean system prompt — AI ดึงเฉพาะส่วนที่จำเป็นจาก SKILL.md ผ่าน RAG
const SYSTEM_PROMPT = `คุณคือ "Panya-AI" — Legal Strategist & Labor Law Expert ประจำ หจก.เผ่าปัญญา ทรานสปอร์ต

บทบาท: ที่ปรึกษาที่เน้นการบริหารความเสี่ยงและปกป้องผลประโยชน์ของนายจ้าง ภายใต้กรอบกฎหมายไทย

# หลักการตอบ
- ตอบเป็นภาษาไทยเท่านั้น ห้ามใช้ภาษาอังกฤษผสม
- อ้างอิงมาตรา/ฎีกาจาก context ที่ให้เท่านั้น ใส่เลขอ้างอิง [N]
- หากข้อมูลไม่เพียงพอ บอกตรงๆ และแนะนำให้ปรึกษาทนายความ
- ห้ามประดิษฐ์มาตราที่ไม่มีอยู่จริง

# รูปแบบคำตอบ
1. บทวิเคราะห์ทางกฎหมาย (อ้างอิง [N])
2. คำแนะนำเชิงกลยุทธ์ฝั่งนายจ้าง
3. ร่างเอกสาร/คำพูด (ถ้ามี)
4. จุดเสี่ยง + ⚠️ RISK ALERT (ถ้ามี)

# เทมเพลตเอกสาร (แนะนำเมื่อเกี่ยวกับการจ้าง/เลิกจ้าง/วินัย)
F1=สัญญาจ้างงาน F2=ทดลองงาน F3=ข้อบังคับการทำงาน F4=ระเบียบวินัย
F5-F7=หนังสือเตือน 1-3 F8=บอกเลิกสัญญา F9=จ่ายค่าชดเชย F10=ใบลาออก
F14=NDA F15=Non-compete F20=ลดค่าจ้าง F22=พักงาน

# กฎหมายหลักที่เกี่ยวข้อง
- พ.ร.บ.คุ้มครองแรงงาน 2541: ม.118(ค่าชดเชย) ม.119(เลิกจ้างไม่ชดเชย) ม.76(หักค่าจ้าง)
- ป.พ.พ.: ม.575(จ้างแรงงาน) vs ม.587(จ้างทำของ/รถร่วม) — แยกให้ชัด
- พ.ร.บ.ประกันสังคม 2533 · พ.ร.บ.เงินทดแทน 2537 · PDPA 2562

# ความแตกต่างสำคัญ: ลูกจ้าง vs รถร่วม
- ลูกจ้าง (ม.575): เงินเดือน เวลาทำงาน อำนาจบังคับบัญชา → ใช้ พ.ร.บ.แรงงาน
- รถร่วม (ม.587): ค่าบริการเหมาจ่าย Service Window อิสระ → ใช้ ป.พ.พ. จ้างทำของ

# Risk Matrix (ประเมินเมื่อมีความเสี่ยง)
Score = Severity(1-5) × Likelihood(1-5)
1-5=ใช้ได้ | 6-10=แจ้งผู้จัดการ | 11-15=ส่งกฎหมาย | 16-20=ส่งผู้บริหาร | 21-25=ทนายตรวจ`;

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

  // RAG: ดึงข้อมูลที่เกี่ยวข้องจากฐานข้อมูล (FTS5 + LIKE fallback)
  const hits = await retrieveRelevant(question, { topK: 10, laborOnly: body.laborOnly });
  const context = buildContext(hits);
  const citations = buildCitations(hits);

  const userMsg = `คำถาม: ${question}

ข้อมูลอ้างอิงจากฐานข้อมูล Panya-AI:
${context}

วิเคราะห์และตอบในฐานะ Legal Strategist ฝั่งนายจ้าง อ้างอิง [N] จาก context ข้างต้น`;

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
    const { content: aiContent } = await createChatCompletion(messages);
    const content = aiContent || `ขออภัย ไม่สามารถสร้างคำตอบได้`;
    return NextResponse.json({ answer: content, citations, retrievedChunks: hits.length });
  } catch (e: any) {
    console.error('AI failed:', e);
    return NextResponse.json({ error: 'AI service error', message: e?.message || '', citations, retrievedChunks: hits.length }, { status: 500 });
  }
}

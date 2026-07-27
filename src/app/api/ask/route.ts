import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { retrieveRelevant, buildContext, buildCitations } from '@/lib/rag';
import ZAI from 'z-ai-web-dev-sdk';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SYSTEM_PROMPT = `คุณเป็นผู้ช่วยวิเคราะห์กฎหมายไทย "Panya-AI"
หน้าที่ของคุณ:
1. ตอบคำถามกฎหมายไทยเป็นภาษาธรรมดาที่คนทั่วไปเข้าใจได้ ไม่ใช้ภาษานิติบัญญัติซับซ้อน
2. อ้างอิง "มาตรา" หรือ "คำพิพากษาฎีกา" จากข้อมูลที่ให้เท่านั้น ห้าม invent มาตราหรือฎีกาที่ไม่มีใน context
3. เมื่ออ้างอิง ให้ใส่เลขอ้างอิงในรูปแบบ [1], [2], ... ตามลำดับใน context ที่ให้
4. หากข้อมูลไม่เพียงพอที่จะตอบ ให้บอกตรงๆ และแนะนำให้ค้นหาเพิ่ม
5. ห้ามให้คำแนะนำทางกฎหมายเจาะจง (legal advice) ให้ข้อข้อมูลเท่านั้น และแนะนำให้ปรึกษาทนายความสำหรับกรณีเฉพาะ
6. ตอบเป็นภาษาไทยเป็นหลัก ยกเว้นผู้ใช้ถามเป็นภาษาอังกฤษ
7. แยกแยะระหว่าง "มาตราของกฎหมาย" และ "คำพิพากษาฎีกา" อย่างชัดเจน โดยระบุประเภทในวงเล็บ เช่น "ตามมาตรา 118 พ.ร.บ.คุ้มครองแรงงาน พ.ศ. 2541 [1]" หรือ "ฎีกาที่ 1766/2544 [2]"

ข้อควรระวังด้าน License:
- คำพิพากษาฎีกาบางส่วนมาจาก TSCC Dataset ซึ่งใช้สำหรับการวิจัย (academic use only) — ห้ามแนะนำให้นำไปใช้เชิงพาณิชย์
- คำตอบนี้ให้ข้อมูลเพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำทางกฎหมาย`;

interface AskBody {
  question: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  laborOnly?: boolean;
}

export async function POST(req: NextRequest) {
  let body: AskBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const question = (body.question || '').trim();
  if (!question) {
    return NextResponse.json({ error: 'question required' }, { status: 400 });
  }
  if (question.length > 1000) {
    return NextResponse.json({ error: 'question too long (max 1000 chars)' }, { status: 400 });
  }

  // 1. Retrieve relevant chunks
  const hits = await retrieveRelevant(question, { topK: 8, laborOnly: body.laborOnly });
  const context = buildContext(hits);
  const citations = buildCitations(hits);

  // 2. Build chat messages
  const userMsg = `คำถาม: ${question}

ข้อมูลอ้างอิงจากฐานข้อมูลกฎหมายไทย:
${context}

กรุณาตอบคำถามโดยอ้างอิงเลข [N] จากข้อมูลข้างต้น หากข้อมูลไม่พอ ให้บอกตรงๆ`;

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  // Include chat history (last 4 turns to keep context manageable)
  if (body.history && Array.isArray(body.history)) {
    const recent = body.history.slice(-4);
    for (const m of recent) {
      if (m.role === 'user' || m.role === 'assistant') {
        messages.push({ role: m.role, content: m.content });
      }
    }
  }

  messages.push({ role: 'user', content: userMsg });

  // 3. Call ZAI chat completions
  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages,
      // Default model — let SDK pick
      stream: false,
      thinking: { type: 'disabled' },
    });

    // Extract assistant message content
    const content =
      completion?.choices?.[0]?.message?.content ??
      completion?.choices?.[0]?.delta?.content ??
      (typeof completion === 'string' ? completion : null) ??
      'ขออภัย ไม่สามารถสร้างคำตอบได้';

    return NextResponse.json({
      answer: content,
      citations,
      retrievedChunks: hits.length,
    });
  } catch (e: any) {
    console.error('ZAI chat completion failed:', e);
    return NextResponse.json({
      error: 'AI service error',
      message: e?.message || 'Unknown error',
      citations,
      retrievedChunks: hits.length,
    }, { status: 500 });
  }
}

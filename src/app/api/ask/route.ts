import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { retrieveRelevant, buildContext, buildCitations } from '@/lib/rag';
import { createChatCompletion } from '@/lib/zai-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SYSTEM_PROMPT = `คุณคือ "ปัญญา AI" ที่ปรึกษากฎหมายไทย ฝั่งนายจ้าง/บริษัท
ฐานะของคุณ: ที่ปรึกษากฎหมายให้ฝั่งนายจ้าง บริษัท หรือผู้ประกอบการ

หลักการของคุณ (สำคัญมาก):
1. ตอบความจริงเท่านั้น — ผิดคือผิด ถูกคือถูก ห้ามพูดเอาใจผู้ใช้
2. ถ้าฝั่งนายจ้างผิด ให้บอกตรงๆ ว่าผิด พร้อมหาแนวทางช่วยเหลือจาก "หนัก" ให้เป็น "เบา" ลดความเสียหายให้น้อยที่สุด
3. ถ้าฝั่งนายจ้างถูก ให้ประเมินปัญหาที่อาจเกิดขึ้นล่วงหน้า แล้วเตือนนายจ้างเผื่อไว้ก่อน (pre-emptive warning) — เพื่อไม่ให้ฝั่งเรากลายเป็นฝ่ายผิดในภายหลัง
4. อ้างอิง "มาตรากฎหมาย" หรือ "คำพิพากษาฎีกา" จาก context เท่านั้น ห้าม invent ข้อมูล
5. ใช้รูปแบบอ้างอิง [1], [2], ... ตามลำดับ context ที่ให้
6. ถ้าข้อมูลไม่เพียงพอ ให้บอกตรงๆ และแนะนำให้ค้นหาเพิ่ม หรือปรึกษาทนายความ
7. ตอบเป็นภาษาไทยเป็นหลัก
8. แยกแยะชัดเจนว่าข้อมูลมาจาก "มาตรากฎหมาย" หรือ "คำพิพากษาฎีกา" หรือ "กฎกระทรวง/ประกาศ"

เมื่อตอบคำถาม ให้จัดโครงสร้างคำตอบเป็น 4 ส่วน:
1. **คำตอบโดยตรง** — ตอบสั้นๆ ว่าถูก/ผิด/เสี่ยง อย่างไร
2. **เหตุผลทางกฎหมาย** — อ้างอิงมาตรา/ฎีกา พร้อมเลข [N]
3. **แนวทางปฏิบัติ** — ขั้นตอนที่นายจ้างควรทำ (เฉพาะฝั่งนายจ้าง)
4. **คำเตือนล่วงหน้า** — ปัญหาที่อาจเกิดขึ้น พร้อมวิธีป้องกัน

โทนการตอบ: ตรงไปตรงมา ไม่อ้อมค้อม ไม่ใช้คำว่า "อาจจะ" ถ้ามีคำตอบชัดเจน
ห้าม: พูดเอาใจ, ตอบสองแง่สองง่ามเพื่อไม่ให้ผู้ใช้ไม่พอใจ, บอกว่า "ทุกอย่างขึ้นอยู่กับสถานการณ์" โดยไม่ให้คำตอบ

ความเชี่ยวชาญ:
- กฎหมายแรงงาน (พ.ร.บ. คุ้มครองแรงงาน, ประกันสังคม, เงินทดแทน, แรงงานสัมพันธ์)
- กฎหมายอาญาที่เกี่ยวกับแรงงาน (ฉ้อโกง, ยักยอก, ปลอมเอกสาร, หมิ่นประมาท)
- กฎหมายแพ่งที่เกี่ยวกับแรงงาน (สัญญาจ้าง, ละเมิด, ค่าเสียหาย)
- กฎหมายแพ่ง/อาญาทั่วไปที่จำเป็นสำหรับธุรกิจ
- การประเมินความเสี่ยงเอกสารสัญญา และการตรวจสอบ/แก้ไขสัญญา

ข้อควรระวังด้าน License:
- คำพิพากษาฎีกาบางส่วนมาจากชุดข้อมูล PBuakhaw/deka_retrival (ใช้เพื่อการศึกษา)
- คำตอบนี้ให้ข้อมูลเพื่อการศึกษา ไม่ใช่คำแนะนำทางกฎหมายเจาะจง — ควรปรึกษาทนายความสำหรับคดีจริง`;

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
  if (question.length > 2000) {
    return NextResponse.json({ error: 'question too long (max 2000 chars)' }, { status: 400 });
  }

  // 1. Retrieve relevant chunks
  const hits = await retrieveRelevant(question, { topK: 10, laborOnly: body.laborOnly });
  const context = buildContext(hits);
  const citations = buildCitations(hits);

  // 2. Build chat messages
  const userMsg = `คำถามจากนายจ้าง/บริษัท: ${question}

ข้อมูลอ้างอิงจากฐานข้อมูลกฎหมายไทย Panya-AI (78 กฎหมาย, 8,507 มาตรา, 502 ฎีกาแรงงาน, 615 กฎกระทรวง, 63 เทมเพลตสัญญา):
${context}

กรุณาตอบในฐานะที่ปรึกษากฎหมายฝั่งนายจ้าง ตรงไปตรงมา อ้างอิง [N] จาก context ข้างต้น`;

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  if (body.history && Array.isArray(body.history)) {
    const recent = body.history.slice(-4);
    for (const m of recent) {
      if (m.role === 'user' || m.role === 'assistant') {
        messages.push({ role: m.role, content: m.content });
      }
    }
  }

  messages.push({ role: 'user', content: userMsg });

  // 3. Call Z.AI chat completions API directly
  try {
    const { content: aiContent, raw } = await createChatCompletion(messages);

    const content = aiContent || `ขออภัย ไม่สามารถสร้างคำตอบได้ (response shape: ${JSON.stringify(Object.keys(raw)).slice(0, 200)})`;

    return NextResponse.json({
      answer: content,
      citations,
      retrievedChunks: hits.length,
    });
  } catch (e: any) {
    console.error('Z.AI chat completion failed:', e);
    return NextResponse.json({
      error: 'AI service error',
      message: e?.message || 'Unknown error',
      citations,
      retrievedChunks: hits.length,
    }, { status: 500 });
  }
}

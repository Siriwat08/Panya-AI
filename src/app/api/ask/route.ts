import { NextRequest, NextResponse } from 'next/server';
import { retrieveRelevant, buildContext, buildCitations } from '@/lib/rag';
import { createChatCompletion } from '@/lib/zai-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ============================================================
// SUB-SKILL DEFINITIONS
// Each skill has: matcher (keyword detection), prompt, RAG config
// ============================================================

interface SubSkill {
  name: string;
  description: string;
  keywords: string[];
  topK: number;
  laborOnly: boolean;
  prompt: string;
}

const SKILLS: SubSkill[] = [
  // 1. CONTRACT REVIEW
  {
    name: 'contract-review',
    description: 'วิเคราะห์สัญญา/เงื่อนไขการจ้าง — หาข้อผิดกฎหมาย + แนะนำแก้ไข',
    keywords: ['สัญญา', 'ตรวจสัญญา', 'ข้อสัญญา', 'clause', 'เงื่อนไขสัญญา', 'NDA', 'ไม่แข่งขัน', 'ค่าปรับ', 'หักเงิน', 'ลดค่าจ้าง', 'เลิกจ้าง', 'บอกเลิก', 'วิเคราะห์สัญญา', 'ผิดกฎหมาย', 'ขัดกฎหมาย'],
    topK: 12,
    laborOnly: true,
    prompt: `คุณคือ "Panya-AI" — Legal Strategist & Labor Law Expert ประจำ หจก.เผ่าปัญญา ทรานสปอร์ต
บทบาท: ที่ปรึกษาที่เน้นการบริหารความเสี่ยงและปกป้องผลประโยชน์ของนายจ้าง

# 📋 SKILL: Contract Review (วิเคราะห์สัญญา)
คุณกำลังทำหน้าที่วิเคราะห์สัญญาหรือเงื่อนไขการจ้าง

## ขั้นตอนวิเคราะห์
1. ระบุประเภทสัญญา: จ้างแรงงาน (ม.575) vs จ้างทำของ/รถร่วม (ม.587)
2. ตรวจแต่ละข้อ: ผิดกฎหมาย? เสียเปรียบนายจ้าง? ขัดมาตราไหน?
3. ให้คะแนนความเสี่ยง: ต่ำ/ปานกลาง/สูง/วิกฤต
4. เสนอข้อแก้ไข: ข้อความที่ควรแก้ + ข้อความที่ถูกต้องตามกฎหมาย

## กฎหมายที่ต้องเช็ค
- พ.ร.บ.แรงงาน 2541: ม.118(ค่าชดเชย) ม.119(เลิกจ้างไม่ชดเชย) ม.76(หักค่าจ้างต้องมีเหตุ)
- ป.พ.พ.: ม.575 vs ม.587 — แยกลูกจ้าง vs รถร่วม
- ห้าม: เลิกจ้างได้ทุกเวลา, หักเงินเป็นค่าปรับ, ลดค่าจ้างฝ่ายเดียว, ห้ามลาออก

## รูปแบบคำตอบ
⚠️ ข้อที่ผิดกฎหมาย:
- [ข้อความในสัญญา] → ผิด [มาตรา] เพราะ [เหตุผล]
- ความรุนแรง: ร้ายแรง/ปานกลาง/ต่ำ

✅ ข้อเสนอแก้ไข:
- เปลี่ยนจาก "..." เป็น "..." (อ้างอิง [N])

📎 เทมเพลตที่แนะนำ: F1/F5-F8/F14/F15 (ถ้าเกี่ยวข้อง)

อ้างอิง [N] จาก context เท่านั้น ตอบภาษาไทย`,
  },

  // 2. RISK ASSESSMENT
  {
    name: 'risk-assessment',
    description: 'ประเมินความเสี่ยงทางกฎหมาย — Risk Matrix 5×5 + แนวป้องกัน',
    keywords: ['เสี่ยง', 'ความเสี่ยง', 'ฟ้อง', 'ฟ้องร้อง', 'คดี', 'ถูกฟ้อง', 'ประเมิน', 'risk', 'เสียเปรียบ', 'กลัวถูก', 'ป้องกัน', 'จะทำยังไง', 'ควรทำยังไง', 'ปลอดภัยไหม'],
    topK: 10,
    laborOnly: true,
    prompt: `คุณคือ "Panya-AI" — Legal Strategist & Labor Law Expert ประจำ หจก.เผ่าปัญญา ทรานสปอร์ต
บทบาท: ที่ปรึกษาที่เน้นการบริหารความเสี่ยงและปกป้องผลประโยชน์ของนายจ้าง

# ⚠️ SKILL: Risk Assessment (ประเมินความเสี่ยง)
คุณกำลังประเมินความเสี่ยงทางกฎหมายให้นายจ้าง

## Risk Matrix 5×5
Severity (1-5): 1=เล็กน้อย, 2=เล็ก, 3=ปานกลาง, 4=สูง, 5=วิกฤต
Likelihood (1-5): 1=น้อย, 2=ไม่น่าจะ, 3=เป็นไปได้, 4=น่าจะ, 5=แน่นอน
Risk Score = Severity × Likelihood (1-25)

## Action Thresholds
1-5: ดำเนินการได้ | 6-10: แจ้งผู้จัดการ | 11-15: ส่งฝ่ายกฎหมาย
16-20: ส่งผู้บริหาร+กฎหมาย | 21-25: ต้องให้ทนายตรวจ

## รูปแบบคำตอบ
📊 การประเมินความเสี่ยง:
- Severity: [1-5] — [เหตุผล]
- Likelihood: [1-5] — [เหตุผล]
- Risk Score: [X/25] — [ระดับ]

🛡️ แนวป้องกัน (ฝั่งนายจ้าง):
1. [สิ่งที่ต้องทำทันที]
2. [เอกสารที่ต้องเตรียม]
3. [ข้อควรระวัง]

⚠️ RISK ALERT: [ถ้า Score > 10 ให้เตือนชัดเจน]

อ้างอิง [N] จาก context เท่านั้น ตอบภาษาไทย`,
  },

  // 3. DOCUMENT DRAFTING
  {
    name: 'document-drafting',
    description: 'ร่างเอกสาร/หนังสือ — แนะนำเทมเพลต + ร่างข้อความ',
    keywords: ['ร่าง', 'เขียน', 'ทำเอกสาร', 'หนังสือ', 'จดหมาย', 'แจ้ง', 'เตือน', 'สัญญาจ้าง', 'สัญญาทดลอง', 'หนังสือเตือน', 'บอกเลิก', 'เลิกจ้าง', 'พักงาน', 'ย้ายตำแหน่ง', 'NDA', 'ไม่แข่งขัน', 'เทมเพลต', 'F1', 'F5', 'F8', 'template'],
    topK: 8,
    laborOnly: true,
    prompt: `คุณคือ "Panya-AI" — Legal Strategist & Labor Law Expert ประจำ หจก.เผ่าปัญญา ทรานสปอร์ต
บทบาท: ที่ปรึกษาที่เน้นการบริหารความเสี่ยงและปกป้องผลประโยชน์ของนายจ้าง

# 📝 SKILL: Document Drafting (ร่างเอกสาร)
คุณกำลังร่างเอกสารหรือแนะนำเทมเพลต

## เทมเพลตในระบบ (F1-F63)
F1=สัญญาจ้างงาน F2=ทดลองงาน F3=ข้อบังคับการทำงาน F4=ระเบียบวินัย
F5-F7=หนังสือเตือน 1/2/3 F8=บอกเลิกสัญญา F9=จ่ายค่าชดเชย F10=ใบลาออก
F14=NDA F15=Non-compete F20=ลดค่าจ้าง F22=พักงาน

## กฎเกณฑ์การร่าง
- ระบุชัดเจน: วันที่, ชื่อ, ตำแหน่ง, เหตุผล, มาตราที่อ้าง
- หนังสือเตือน: ต้องมี F5→F6→F7 (3 ครั้ง) ก่อน F8 (ม.119(4))
- บอกเลิกสัญญา: ต้องบอกกล่าวล่วงหน้า (ม.17 ป.พ.พ.) หรือจ่ายแทน
- ค่าชดเชย: ต้องจ่าย ณ วันเลิกจ้าง (ม.118) — เลยกำหนด = ดอกเบี้ย 15%/ปี

## รูปแบบคำตอบ
📎 เทมเพลตที่แนะนำ: [Fx: ชื่อเทมเพลต] — [เหตุผลที่ใช้]

📝 ร่างเอกสาร:
---
[หัวเอกสาร]
เลขที่: ...
วันที่: ...

เรื่อง: ...
เรียน: [ชื่อพนักงาน]

[เนื้อหา — ระบุเหตุผล + มาตราที่อ้างอิง [N]]

ขอแสดงความนับถือ
[ผู้ลงนาม]
---

⚠️ ข้อควรระวัง: [สิ่งที่ต้องระวังก่อนส่งเอกสาร]

อ้างอิง [N] จาก context เท่านั้น ตอบภาษาไทย`,
  },

  // 4. GENERAL LEGAL Q&A (default)
  {
    name: 'legal-qa',
    description: 'ตอบคำถามกฎหมายทั่วไป — อ้างอิงมาตรา/ฎีกา',
    keywords: [], // default — ใช้เมื่อไม่ตรง skill อื่น
    topK: 10,
    laborOnly: true,
    prompt: `คุณคือ "Panya-AI" — Legal Strategist & Labor Law Expert ประจำ หจก.เผ่าปัญญา ทรานสปอร์ต
บทบาท: ที่ปรึกษาที่เน้นการบริหารความเสี่ยงและปกป้องผลประโยชน์ของนายจ้าง

# 💬 SKILL: Legal Q&A (ตอบคำถามกฎหมาย)

## หลักการตอบ
- ตอบเป็นภาษาไทยเท่านั้น ห้ามใช้ภาษาอังกฤษผสม
- อ้างอิงมาตรา/ฎีกาจาก context ที่ให้เท่านั้น ใส่เลขอ้างอิง [N]
- หากข้อมูลไม่เพียงพอ บอกตรงๆ และแนะนำให้ปรึกษาทนายความ
- ห้ามประดิษฐ์มาตราที่ไม่มีอยู่จริง

## กฎหมายหลัก
- พ.ร.บ.คุ้มครองแรงงาน 2541: ม.118 ม.119 ม.76
- ป.พ.พ.: ม.575(จ้างแรงงาน) vs ม.587(จ้างทำของ/รถร่วม)
- พ.ร.บ.ประกันสังคม 2533 · พ.ร.บ.เงินทดแทน 2537 · PDPA 2562

## ลูกจ้าง vs รถร่วม
- ลูกจ้าง (ม.575): เงินเดือน เวลาทำงาน → ใช้ พ.ร.บ.แรงงาน
- รถร่วม (ม.587): ค่าบริการเหมาจ่าย → ใช้ ป.พ.พ. จ้างทำของ

## รูปแบบคำตอบ
1. บทวิเคราะห์ทางกฎหมาย (อ้างอิง [N])
2. คำแนะนำเชิงกลยุทธ์ฝั่งนายจ้าง
3. จุดเสี่ยง + ⚠️ RISK ALERT (ถ้ามี)

อ้างอิง [N] จาก context เท่านั้น ตอบภาษาไทย`,
  },
];

// ============================================================
// SKILL ROUTER — เลือก skill จากคำถาม
// ============================================================

function selectSkill(question: string): SubSkill {
  const q = question.toLowerCase();
  let bestSkill = SKILLS[SKILLS.length - 1]; // default = legal-qa
  let bestScore = 0;

  for (const skill of SKILLS) {
    if (skill.keywords.length === 0) continue; // skip default
    let score = 0;
    for (const kw of skill.keywords) {
      if (q.includes(kw.toLowerCase())) {
        score += kw.length > 3 ? 2 : 1; // longer keyword = higher weight
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestSkill = skill;
    }
  }

  // If no keyword matched, use default
  if (bestScore === 0) {
    bestSkill = SKILLS[SKILLS.length - 1];
  }

  return bestSkill;
}

// ============================================================
// API ROUTE
// ============================================================

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

  // 1. Route to appropriate sub-skill
  const skill = selectSkill(question);
  console.log(`[ask] skill=${skill.name} (question="${question.slice(0, 60)}...")`);

  // 2. RAG: ดึงข้อมูลที่เกี่ยวข้อง (ใช้ topK และ laborOnly ของ skill)
  const hits = await retrieveRelevant(question, {
    topK: skill.topK,
    laborOnly: body.laborOnly !== undefined ? body.laborOnly : skill.laborOnly,
  });
  const context = buildContext(hits);
  const citations = buildCitations(hits);

  // 3. Build message with skill-specific prompt
  const userMsg = `คำถาม: ${question}

ข้อมูลอ้างอิงจากฐานข้อมูล Panya-AI:
${context}

วิเคราะห์และตอบในฐานะ Legal Strategist ฝั่งนายจ้าง อ้างอิง [N] จาก context ข้างต้น`;

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: skill.prompt },
  ];
  if (body.history && Array.isArray(body.history)) {
    for (const m of body.history.slice(-4)) {
      if (m.role === 'user' || m.role === 'assistant') messages.push({ role: m.role, content: m.content });
    }
  }
  messages.push({ role: 'user', content: userMsg });

  // 4. Call AI
  try {
    const { content: aiContent } = await createChatCompletion(messages);
    const content = aiContent || `ขออภัย ไม่สามารถสร้างคำตอบได้`;
    return NextResponse.json({
      answer: content,
      citations,
      retrievedChunks: hits.length,
      skill: skill.name, // ส่งชื่อ skill กลับไปให้ frontend แสดง
    });
  } catch (e: any) {
    console.error('AI failed:', e);
    return NextResponse.json({
      error: 'AI service error',
      message: e?.message || '',
      citations,
      retrievedChunks: hits.length,
      skill: skill.name,
    }, { status: 500 });
  }
}

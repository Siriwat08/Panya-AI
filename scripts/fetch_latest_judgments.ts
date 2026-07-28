/**
 * Fetch latest 12 Supreme Court labor judgments from deka.in.th
 * URLs provided by user's previous AI research session.
 * 
 * Extracts: title, short summary, full judgment text, related laws
 * Then inserts into Turso judgments table (G503-G514).
 */

import { createClient } from '@libsql/client'

const TURSO_URL = 'libsql://panya-ai-siriwat08.aws-ap-northeast-1.turso.io'
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODUyMzI3MjcsImlkIjoiMDE5ZmEzNzQtYjAwMS03MWZiLWJiZjYtNjQ2YThkMzNmMWViIiwia2lkIjoiLWg1N1RSRmlJT0dMdldjYmpRSU9uVDJLU0tZWW4xZE1zYi1yMlk1TzVLMCIsInJpZCI6ImUxODZhMzBkLWIwY2ItNDhjYi04YWFlLTZhMGE2OWU1YmYxNCJ9.xDpHYWYoV2GyxUOjBDXndONUu059L0hMjCFEJDXNwzwB6xm0icUCRSIQTWyt_a8opI7Wo1OVj9n59NZwfmk_DA'

const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })

const JUDGMENT_URLS = [
  'https://deka.in.th/deka/2568-8320',
  'https://deka.in.th/deka/2567-3114-717469',
  'https://deka.in.th/deka/2566-4468',
  'https://deka.in.th/deka/2565-62',
  'https://deka.in.th/deka/2566-3805',
  'https://deka.in.th/deka/2566-1875',
  'https://deka.in.th/deka/2567-3081-717468',
  'https://deka.in.th/deka/2567-3113-710790',
  'https://deka.in.th/deka/2568-3150',
  'https://deka.in.th/deka/2567-3113',
  'https://deka.in.th/deka/2567-3116',
  'https://deka.in.th/deka/2565-61',
]

interface JudgmentData {
  dekaNo: string
  year: string
  title: string
  shortSummary: string
  fullText: string
  relatedLaws: string[]
  url: string
}

async function fetchJudgment(url: string): Promise<JudgmentData | null> {
  console.log(`  Fetching ${url}...`)
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'th-TH,th;q=0.9',
      },
    })
    if (!resp.ok) {
      console.error(`    HTTP ${resp.status}`)
      return null
    }
    const html = await resp.text()

    // Extract deka number from URL (e.g., 2568-8320 → 8320/2568)
    const urlMatch = url.match(/\/(\d{4})-(\d+)/)
    const year = urlMatch ? urlMatch[1] : ''
    const caseNum = urlMatch ? urlMatch[2] : ''
    const dekaNo = `${caseNum}/${year}`

    // Extract title from <title> tag
    const titleMatch = html.match(/<title>([^<]+)<\/title>/)
    const title = titleMatch ? titleMatch[1].replace(/\s*\|.*$/, '').trim() : `ฎีกาที่ ${dekaNo}`

    // Extract meta description (short summary)
    const descMatch = html.match(/<meta name="description" content="([^"]+)"/)
    const shortSummary = descMatch ? descMatch[1] : ''

    // Extract full judgment text from page content
    // Look for content between specific markers
    let fullText = ''

    // Try to find judgment content div
    const contentMatch = html.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
    if (contentMatch) {
      fullText = contentMatch[1]
    }

    // If not found, extract from article/main tags
    if (!fullText) {
      const articleMatch = html.match(/<(?:article|main)[^>]*>([\s\S]*?)<\/(?:article|main)>/i)
      if (articleMatch) fullText = articleMatch[1]
    }

    // Clean HTML tags
    fullText = fullText
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^[ \t]+/gm, '')
      .trim()

    // If fullText is too short, use the whole page text
    if (fullText.length < 200) {
      fullText = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, '\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/^[ \t]+/gm, '')
        .trim()
    }

    // Extract related laws from content
    const relatedLaws: string[] = []
    const lawMatches = fullText.match(/พระราชบัญญัติ[^ก-๙]*?\d{4}|ประมวลกฎหมาย[^ก-๙]*?(?:\d{4})?/g)
    if (lawMatches) {
      for (const law of lawMatches) {
        const cleaned = law.trim().replace(/\s+/g, ' ')
        if (cleaned.length > 5 && !relatedLaws.includes(cleaned)) {
          relatedLaws.push(cleaned)
        }
      }
    }

    console.log(`    ✓ ${dekaNo} — ${title.slice(0, 50)}... (${fullText.length} chars)`)
    return { dekaNo, year, title, shortSummary, fullText: fullText.slice(0, 15000), relatedLaws: relatedLaws.slice(0, 10), url }
  } catch (e: any) {
    console.error(`    ✗ ${e.message.slice(0, 100)}`)
    return null
  }
}

async function main() {
  console.log('⚖️ Fetching 12 latest Supreme Court labor judgments from deka.in.th...\n')

  const results: JudgmentData[] = []
  for (const url of JUDGMENT_URLS) {
    const j = await fetchJudgment(url)
    if (j) results.push(j)
    // Be polite — wait 1.5s between requests
    await new Promise(r => setTimeout(r, 1500))
  }

  console.log(`\n✓ Fetched ${results.length}/${JUDGMENT_URLS.length} judgments`)

  // Insert into Turso (judgment_id 503-514)
  console.log('\n📤 Inserting into Turso...')
  let inserted = 0
  for (let i = 0; i < results.length; i++) {
    const j = results[i]
    const judgmentId = 503 + i

    try {
      await client.execute({
        sql: `INSERT OR REPLACE INTO judgments (judgment_id, judgment_code, deka_no, case_number, year,
              case_type, case_type_group, topic, topics, laws_cited,
              fact, issue, ruling, verdict, full_text,
              source_url, source_id, chars_count, note)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          judgmentId,
          `G${String(judgmentId).padStart(3, '0')}`,
          j.dekaNo,
          j.dekaNo,
          j.year,
          'แรงงาน',
          'คดีธุรกิจและเศรษฐกิจ',
          j.shortSummary.slice(0, 200) || null,
          JSON.stringify([]),
          JSON.stringify(j.relatedLaws),
          j.shortSummary || null,  // fact = short summary
          null,
          null,
          null,
          j.fullText,
          j.url,
          3,  // source_id = 3 (PBuakhaw/deka_retrival — closest match)
          j.fullText.length,
          `ดึงจาก deka.in.th เมื่อ 2026-07-28 — ฎีกาล่าสุดปี 2565-2568`,
        ],
      })

      // Also insert RAG chunk
      const ragText = j.shortSummary + '\n\n' + j.fullText.slice(0, 3000)
      await client.execute({
        sql: `INSERT INTO rag_chunks (source_type, source_id, source_code, chunk_text, chunk_metadata)
              VALUES ('judgment', ?, ?, ?, ?)`,
        args: [
          judgmentId,
          `G${String(judgmentId).padStart(3, '0')}`,
          ragText,
          JSON.stringify({
            judgment_id: judgmentId,
            deka_no: j.dekaNo,
            year: j.year,
            topic: j.shortSummary.slice(0, 100),
            case_type: 'แรงงาน',
            source: 'deka.in.th',
            fetched_date: '2026-07-28',
          }),
        ],
      })

      inserted++
      console.log(`  ✓ Inserted G${String(judgmentId).padStart(3, '0')} — ${j.dekaNo}`)
    } catch (e: any) {
      console.error(`  ✗ G${String(judgmentId).padStart(3, '0')}: ${e.message.slice(0, 100)}`)
    }
  }

  // Verify
  const count = await client.execute('SELECT COUNT(*) as n FROM judgments')
  console.log(`\n📊 Total judgments in Turso: ${count.rows[0].n}`)
  console.log(`✓ Inserted ${inserted} new judgments`)

  client.close()
}

main().catch(e => {
  console.error('FATAL:', e)
  process.exit(1)
})

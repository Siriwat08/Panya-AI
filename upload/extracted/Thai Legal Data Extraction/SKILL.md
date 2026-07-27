---
name: thai-legal-data-extraction
description: "Extract, structure, and build databases from Thai legal sources including law.go.th (Council of State), Supreme Court judgments (deka.supremecourt.or.th), PyThaiNLP/thai-law datasets, and TSCC judgment datasets. Use when building Thai legal databases, extracting law texts, fetching Supreme Court judgments, or working with Thai legal data in any format. Covers labor law, civil law, criminal law, and procedural law."
license: MIT
metadata:
  version: '1.0'
  author: 'Perplexity Computer'
  language: 'th'
---

# Thai Legal Data Extraction

## When to Use This Skill

Use this skill when the user asks to:

- Build a database of Thai laws (กฎหมายไทย)
- Extract law texts from law.go.th (สำนักงานคณะกรรมการกฤษฎีกา)
- Fetch Supreme Court judgments (คำพิพากษาศาลฎีกา) from deka.supremecourt.or.th
- Search for specific Thai laws by name or keyword
- Structure legal data into SQLite or other database formats
- Work with Thai legal datasets (PyThaiNLP, TSCC, Open Law Data Thailand)
- Collect labor-related legal provisions across multiple laws
- Build RAG (Retrieval-Augmented Generation) systems for Thai law

## Key Data Sources

### 1. law.go.th (สำนักงานคณะกรรมการกฤษฎีกา)

- **Base URL:** https://law.go.th
- **Law detail page:** `https://law.go.th/DetailLawPage?table_of_law_id=XXXX`
- **Search API:** `POST https://apig.law.go.th/dga-user-service-phase2/law/searchResultAdvance`
- **Content:** Full text of all Thai laws with amendment history
- **Downloads:** PDF and DOCX available for each law
- **Note:** law.go.th blocks `fetch_url` via robots.txt. Use `browser_task` to access content.

#### table_of_law_id Reference (14 Key Laws)

| Law | table_of_law_id |
|-----|----------------|
| พ.ร.บ. คุ้มครองแรงงาน พ.ศ. 2541 | 8876 |
| ประมวลกฎหมายแพ่งและพาณิชย์ | 9087 |
| ประมวลกฎหมายอาญา | 9186 |
| พ.ร.บ. ประกันสังคม พ.ศ. 2533 | 8832 |
| พ.ร.บ. เงินทดแทน พ.ศ. 2537 | 8622 |
| พ.ร.บ. แรงงานสัมพันธ์ พ.ศ. 2518 | 8637 |
| พ.ร.บ. คุ้มครองผู้รับงานไปทำที่บ้าน พ.ศ. 2553 | 9413 |
| พ.ร.บ. จัดหางานและคุ้มครองคนหางาน พ.ศ. 2528 | 9383 |
| ประมวลกฎหมายวิธีพิจารณาความแพ่ง | 8465 |
| ประมวลกฎหมายที่ดิน | 9057 |
| พ.ร.บ. ควบคุมการเช่าเคหะและที่ดิน พ.ศ. 2504 | 12070 |
| ประมวลกฎหมายวิธีพิจารณาความอาญา | 9280 |
| พ.ร.บ. ยาเสพติดให้โทษ พ.ศ. 2522 | 12051 |
| พ.ร.บ. จราจรทางบก พ.ศ. 2522 | 9364 |

### 2. deka.supremecourt.or.th (ศาลฎีกา)

- **Base URL:** http://deka.supremecourt.or.th/
- **Content:** Supreme Court judgments (คำพิพากษาฎีกา)
- **Search:** By case type (แรงงาน/แพ่ง/อาญา), keyword, year, case number
- **Note:** May require browser_task; site can be slow or temporarily unavailable

### 3. PyThaiNLP/thai-law (Hugging Face + GitHub)

- **Hugging Face:** https://huggingface.co/datasets/pythainlp/thailaw
  - 42,755 rows, columns: sysid, title, txt
  - Public domain
- **GitHub releases:** https://github.com/PyThaiNLP/thai-law/releases
  - Criminal Code CSV: 453 sections
  - Civil and Commercial Code CSV: 1,911 sections

### 4. TSCC Dataset (Thai Supreme Court Criminal Cases)

- **URL:** https://github.com/KevinMercury/tscc-dataset
- **Content:** 1,000 criminal Supreme Court judgments, 1,207 issues
- **License:** Academic use only - NOT for commercial use
- **Files:** tscc_v0.1-judgement.csv, tscc_v0.1-law.csv

### 5. Other Sources

- **Royal Gazette:** https://ratchakitcha.soc.go.th/
- **Krisdika:** https://www.krisdika.go.th/
- **Open Law Data Thailand:** https://www.openlawdatathailand.org/ (1.34M+ documents)
- **Ministry of Labor judgments:** https://ops.mol.go.th/sentence
- **ThaiDeka:** https://deka.in.th/ (private, 5,791+ labor cases)
- **Law3S:** https://deka.law3s.com/ (AI-powered search)

## Instructions

### Step 1: Identify Which Laws Are Needed

Determine the scope of laws required. The 14 key Thai laws cover:
1. Labor laws (6): คุ้มครองแรงงาน, ประกันสังคม, เงินทดแทน, แรงงานสัมพันธ์, คุ้มครองผู้รับงานไปทำที่บ้าน, จัดหางานฯ
2. Core codes (3): ประมวลกฎหมายแพ่งฯ, ประมวลกฎหมายอาญา, ประมวลกฎหมายที่ดิน
3. Procedural codes (2): วิธีพิจารณาความแพ่ง, วิธีพิจารณาความอาญา
4. Special laws (3): ยาเสพติดให้โทษ, จราจรทางบก, ควบคุมการเช่าเคหะ

### Step 2: Fetch Law Texts

For laws available on PyThaiNLP Hugging Face (fastest):
```python
from datasets import load_dataset
ds = load_dataset("pythainlp/thailaw", split="train")
# Search by sysid or title
```

For laws NOT on PyThaiNLP, use law.go.th via browser_task:
- Navigate to `https://law.go.th/DetailLawPage?table_of_law_id=XXXX`
- Select the latest consolidated version
- Extract all section texts
- Download PDF/DOCX if available

### Step 3: Fetch Supreme Court Judgments

Use deka.supremecourt.or.th via browser_task:
- Search by case type (labor/civil/criminal)
- Search by keywords (แรงงาน, เลิกจ้าง, ค่าจ้าง, ลูกจ้าง, นายจ้าง)
- Record case number, year, category, title, full text

### Step 4: Extract Labor-Related Provisions from Other Laws

Search all law sections for labor keywords:
- จ้าง, ลูกจ้าง, นายจ้าง, ค่าจ้าง, แรงงาน, สัญญาจ้าง, ตกลงจ้าง, จ้างแรงงาน

Key labor sections in Civil and Commercial Code:
- มาตรา 575-586: จ้างแรงงาน (Contract of Employment)
- มาตรา 587-607: จ้างทำของ (Contract for Work)
- มาตรา 425-426: นายจ้างรับผิดต่อลูกจ้าง (Employer Liability)
- มาตรา 257, 272: บุริมสิทธิของลูกจ้าง (Employee Priority Rights)

Key labor sections in Criminal Code:
- มาตรา 117: ยุยงหยุดงาน/ปิดงาน (Inciting Strike/Lockout)
- มาตรา 344: หลอกลวงไม่ใช้ค่าแรงงาน (Fraud - Unpaid Wages)

### Step 5: Build SQLite Database

Recommended schema:
```sql
CREATE TABLE sources (source_id, source_name, source_url, source_type, license);
CREATE TABLE laws (law_id, law_name_th, law_name_en, law_year, krisdika_sysid, law_go_th_id, source_url, status, full_text, notes);
CREATE TABLE law_sections (section_id, law_id, article_key, section_text, section_type);
CREATE TABLE case_judgments (judgment_id, case_number, year, category, title, summary, full_text, source_id);
CREATE TABLE case_law_links (link_id, judgment_id, section_id, law_id);
CREATE TABLE ingestion_log (log_id, table_name, record_count, source_file, notes);
```

### Step 6: Validate and Quality Check

- Verify all 14 laws have entries (even if text is missing)
- Check for duplicate sections
- Validate foreign key relationships
- Test FTS (Full Text Search) if enabled
- Verify labor-related sections are properly tagged

## Database Structure Reference

The built database should contain:
- 8+ data sources
- 14 law records with law.go.th URLs
- 2,000+ law sections (Civil Code 1,911 + Criminal Code 575+ + other laws)
- 1,000+ Supreme Court judgments
- Cross-references between judgments and law sections

## Labor Law Focus

When the user requests labor-related data, collect ALL of the following:

1. **Dedicated labor laws (6):** คุ้มครองแรงงาน, ประกันสังคม, เงินทดแทน, แรงงานสัมพันธ์, คุ้มครองผู้รับงานไปทำที่บ้าน, จัดหางานฯ
2. **Labor sections in Civil Code (63+ sections):** มาตรา 575-607 (employment contracts), 425-426 (employer liability), 257/272 (employee priority)
3. **Labor sections in Criminal Code (14+ sections):** มาตรา 117 (strike/lockout), 344 (wage fraud)
4. **Supreme Court labor judgments:** From deka.supremecourt.or.th
5. **Ministry of Labor judgments:** From ops.mol.go.th/sentence

## License Considerations

- **PyThaiNLP/thai-law:** Public domain
- **TSCC Dataset:** Academic use only - do NOT use commercially
- **law.go.th content:** Government publication, freely accessible
- **Supreme Court judgments:** Public domain (government publications)
- **Open Law Data Thailand:** Check individual document licenses

## Examples

### Example 1: Fetch a law from law.go.th
```python
# Use browser_task to navigate to:
# https://law.go.th/DetailLawPage?table_of_law_id=8832
# Extract all section texts from the page
```

### Example 2: Search PyThaiNLP dataset
```python
from datasets import load_dataset
ds = load_dataset("pythainlp/thailaw", split="train")
labor_law = ds.filter(lambda x: x['sysid'] == 642571)
print(labor_law[0]['title'], labor_law[0]['txt'][:200])
```

### Example 3: Find labor sections in Civil Code
```sql
SELECT article_key, substr(section_text, 1, 100) 
FROM law_sections 
WHERE law_id = 2 AND section_text LIKE '%ลูกจ้าง%'
ORDER BY article_key;
```

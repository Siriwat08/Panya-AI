---
name: thai-legal-data-extraction
description: "Extract, structure, and build databases from Thai legal sources for Legal AI / Contract Review AI. Covers 30+ Thai laws, Supreme Court judgments, Labor Court decisions, government legal opinions, plus Knowledge Layer (Clause Library, Compliance Checklists, Risk Matrix, Legal Ontology). Use when building Thai legal databases, contract review systems, or legal risk assessment platforms."
license: MIT
metadata:
  version: '2.0'
  author: 'Panya-AI'
  language: 'th'
  last_updated: '2026-07-27'
---

# Thai Legal Data Extraction & Knowledge Base

## When to Use This Skill

Use this skill when the user asks to:

- Build a database of Thai laws (กฎหมายไทย) — both statutory text and amendments
- Extract law texts from law.go.th (สำนักงานคณะกรรมการกฤษฎีกา)
- Fetch Supreme Court judgments (คำพิพากษาศาลฎีกา) from deka.supremecourt.or.th / deka.in.th
- Fetch Labor Court judgments (ศาลแรงงานกลาง) from ops.mol.go.th
- Build **Contract Review AI** (AI ตรวจสัญญา) for Thai law
- Build **Legal Risk Assessment** system (ประเมินความเสี่ยงทางกฎหมาย)
- Build RAG systems for Thai law with citation support
- Build Knowledge Layer (Clause Library, Checklists, Risk Matrix)
- Deploy Thai Legal AI to Vercel/Cloudflare with Turso/Supabase backend

---

## 1. Architecture — 4 Layer Model

A production-grade Legal AI for Thai law should be structured in **4 distinct layers** (not just one database):

### Layer 1 — Legal Sources (แหล่งข้อมูลกฎหมาย)
- Statutory text (ตัวบทกฎหมาย)
- Ministerial regulations (กฎกระทรวง)
- Announcements (ประกาศ)
- Court judgments (คำพิพากษา — ฎีกา/แรงงาน/อุทธรณ์)
- Council of State opinions (คำวินิจฉัยกฤษฎีกา)
- Government agency consultation replies (หนังสือตอบข้อหารือ)

### Layer 2 — Knowledge Base (องค์ความรู้)
- Clause Library (คลังข้อสัญญา — with metadata, risk levels, related laws)
- Compliance Checklists (per contract type)
- Contract Templates (แบบสัญญามาตรฐาน — anonymized)
- Legal Dictionary (พจนานุกรมนิติศาสตร์ — Thai + English + synonyms)
- Legal Ontology / Knowledge Graph (ความสัมพันธ์ระหว่างประเด็น)
- Issue Taxonomy (จำแนกประเภทประเด็นกฎหมาย)
- Industry Rules (e.g., Healthcare, Construction, IT)

### Layer 3 — Decision Rules (กฎการวิเคราะห์)
- Risk Matrix (Severity × Likelihood = Risk Score)
- Escalation Rules (when to send to lawyer/executive)
- Legal Reasoning Rules (rule engine for IF-THEN patterns)
- Risk Pattern Database (common illegal/risky clauses)
- Compliance Rules

### Layer 4 — AI Output Standards (มาตรฐานผลลัพธ์)
- Citation Format (รูปแบบการอ้างอิง)
- Evidence Chain (ลูกโซ่หลักฐาน Finding → Evidence → Law → Court → Risk → Recommendation)
- Recommendation Template
- Confidence Score
- Explainability Rules

---

## 2. Statutory Sources — 30+ Laws (Tiered Priority)

### Tier 1 — Critical for Contract Review (must have)

| # | Law | Year | law.go.th ID | Why critical |
|---|-----|------|-------------|--------------|
| 1 | พ.ร.บ. คุ้มครองแรงงาน | 2541 | 8876 | Employment contracts |
| 2 | ประมวลกฎหมายแพ่งและพาณิชย์ (ป.พ.พ.) | 2468 | 9087 | All contract types |
| 3 | ประมวลกฎหมายอาญา (ป.อ.) | 2499 | 9186 | Criminal risk in contracts |
| 4 | พ.ร.บ. ว่าด้วยข้อสัญญาที่ไม่เป็นธรรม ⭐ | 2540 | (lookup) | **Criteria for "unfair contract terms"** |
| 5 | พ.ร.บ. ความลับทางการค้า ⭐ | 2545 | (lookup) | **NDA-specific law** |
| 6 | พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) | 2562 | (lookup) | Personal data in contracts |
| 7 | พ.ร.บ. คุ้มครองผู้บริโภค | 2522 | (lookup) | Consumer contracts |
| 8 | พ.ร.บ. ธุรกรรมทางอิเล็กทรอนิกส์ | 2544 | (lookup) | e-Contracts, e-Signatures |
| 9 | ประมวลกฎหมายวิธีพิจารณาความแพ่ง (ป.วิ.พ.) | 2478 | 8465 | Civil procedure |
| 10 | ประมวลกฎหมายวิธีพิจารณาความอาญา (ป.วิ.อ.) | 2478 | 9280 | Criminal procedure |
| 11 | พ.ร.บ. วิธีพิจารณาคดีแรงงาน | 2522 | (lookup) | Labor court procedure |

### Tier 2 — Important (should have for full coverage)

| # | Law | Year | Use case |
|---|-----|------|----------|
| 12 | พ.ร.บ. แรงงานสัมพันธ์ | 2518 | Unions, strikes |
| 13 | พ.ร.บ. ประกันสังคม | 2533 | Social security rights |
| 14 | พ.ร.บ. เงินทดแทน | 2537 | Work injury compensation |
| 15 | พ.ร.บ. คุ้มครองผู้รับงานไปทำที่บ้าน | 2553 | Home-worker contracts |
| 16 | พ.ร.บ. จัดหางานและคุ้มครองคนหางาน | 2528 | Agency employment |
| 17 | พ.ร.บ. การเช่าอสังหาริมทรัพย์เพื่อพาณิชยกรรม | 2542 | Commercial lease |
| 18 | ประมวลกฎหมายที่ดิน | 2497 | Land-related contracts |
| 19 | พ.ร.บ. ลิขสิทธิ์ | 2537 | IP in contracts |
| 20 | พ.ร.บ. หลักประกันทางธุรกิจ | 2558 | Security/mortgage |
| 21 | พ.ร.บ. บริษัทมหาชนจำกัด | 2535 | Corporate contracts |
| 22 | พ.ร.บ. ล้มละลาย | 2483 | Bankruptcy, creditors |
| 23 | พ.ร.บ. การแข่งขันทางการค้า | 2560 | Non-compete, exclusivity |
| 24 | พ.ร.บ. อนุญาโตตุลาการ | 2530 | Arbitration clauses |
| 25 | พ.ร.บ. ขายตรงและตลาดแบบตรง | 2545 | Direct sales contracts |
| 26 | พ.ร.บ. การป้องกันและปราบปรามการฟอกเงิน | 2542 | KYC in contracts |

### Tier 3 — Reference (nice to have)

| # | Law | Year | Use case |
|---|-----|------|----------|
| 27 | รัฐธรรมนูญแห่งราชอาณาจักรไทย | 2560 | Constitutional rights |
| 28 | พ.ร.ธรรมนูญศาลยุติธรรม | 2543 | Court jurisdiction |
| 29 | พ.ร.บ. จัดตั้งศาลแรงงาน | 2522 | Labor court structure |
| 30 | พ.ร.บ. วิธีพิจารณาคดีผู้บริโภค | 2551 | Consumer court procedure |
| 31 | ประมวลรัษฎากร (Tax Code) | - | Stamp duty, withholding tax |
| 32 | พ.ร.บ. ยาเสพติดให้โทษ | 2522 | (existing) |
| 33 | พ.ร.บ. จราจรทางบก | 2522 | (existing) |
| 34 | พ.ร.บ. ควบคุมการเช่าเคหะและที่ดิน | 2504 | (existing) |

---

## 3. Data Sources

### 3.1 Statutory Text Sources

| Source | URL | License | Use |
|--------|-----|---------|-----|
| law.go.th (กฤษฎีกา) | https://law.go.th | Public domain (gov) | All Thai laws, full text + amendments |
| law.go.th API | `https://apig.law.go.th/dga-user-service-phase2/law/detail/{id}` Header: `apikey: 4nEZYvTwRFlUVn7aK85cZ2xSU83dOFai` | Public domain | Programmatic law fetch |
| Royal Gazette | https://ratchakitcha.soc.go.th | Public domain | Original law text + amendments |
| Krisdika | https://www.krisdika.go.th | Public domain | Council of State opinions |
| PyThaiNLP/thai-law | https://huggingface.co/datasets/pythainlp/thailaw | Public domain | 42,755 rows; CCC + Penal Code |

### 3.2 Case Law Sources

| Source | URL | Coverage | License |
|--------|-----|----------|---------|
| ระบบสืบค้นคำพิพากษาศาลฎีกา | http://deka.supremecourt.or.th/ | ฎีกาทั้งหมด | Public domain (gov) — but blocks browser automation |
| ThaiDeka | https://deka.in.th/ | 5,791+ labor cases | Requires login for full text |
| กระทรวงแรงงาน | https://ops.mol.go.th/sentence | 4,326 labor judgment pages | Public domain |
| TSCC Dataset | https://github.com/KevinMercury/tscc-dataset | 1,207 criminal cases | **Academic use only — NOT for commercial use** |
| Open Law Data Thailand | https://www.openlawdatathailand.org/ | 1.34M+ documents | Per-document license — verify each |
| Law3S | https://deka.law3s.com/ | AI-powered search | Verify terms |

### 3.3 Government Opinions & Guidelines

| Source | URL | Use |
|--------|-----|-----|
| คำวินิจฉัย คตร. (กฤษฎีกา) | https://www.krisdika.go.th | Law interpretation |
| ประกาศกระทรวงแรงงาน | https://www.mol.go.th | Min wage, OT, leave, WFH rules |
| ประกาศคณะกรรมการคุ้มครองแรงงาน | https://www.mol.go.th | Contract forms, compensation rules |
| PDPC Guidelines | https://www.pdpc.go.th | PDPA implementation, consent, transfer |
| ความเห็นกฤษฎีกา | https://www.krisdika.go.th | Opinion on legal questions |
| หนังสือตอบข้อหารือ | various agencies | Practical law application |

### 3.4 Standard Contracts & Templates

| Source | URL | Use |
|--------|-----|-----|
| DBD (กรมพัฒนาธุรกิจ) | https://www.dbd.go.th | Standard contract templates |
| BOI | https://www.boi.go.th | Investment contracts |
| DIPW (กรมทรัพย์สินทางปัญญา) | https://www.ipthailand.go.th | IP license templates |

---

## 4. Database Schema (Recommended)

The current schema (v1.0) covers **Layer 1** (statutes + judgments). For full Enterprise-grade Legal AI, extend with these tables:

### 4.1 Existing Tables (Layer 1)
```sql
sources, laws, law_sections, case_judgments, case_law_links, ingestion_log, rag_chunks
```

### 4.2 New Tables for Knowledge Layer (Layer 2-3)

```sql
-- ========== Layer 2: Knowledge Base ==========

-- Clause Library: 300-500 standard clauses with metadata
CREATE TABLE clauses (
  clause_id INTEGER PRIMARY KEY,
  clause_name TEXT NOT NULL,           -- e.g. "Termination", "Confidentiality"
  clause_name_th TEXT,                 -- การเลิกสัญญา, การรักษาความลับ
  category TEXT,                       -- Employment, NDA, Service, Lease, Loan
  purpose TEXT,                        -- What this clause does
  mandatory INTEGER DEFAULT 0,         -- 1 = required, 0 = optional
  risk_if_missing TEXT,                -- Low/Medium/High/Critical
  related_law_ids TEXT,                -- JSON array of law_id
  related_section_ids TEXT,            -- JSON array of section_id
  related_judgment_ids TEXT,           -- JSON array of judgment_id
  sample_good TEXT,                    -- Good example
  sample_bad TEXT,                     -- Bad example (illegal/risky)
  typical_position TEXT,               -- Where in contract
  alternatives TEXT,                   -- JSON array of alternative versions
  tags TEXT,                           -- Search keywords
  notes TEXT
);

-- Compliance Checklist: per contract type
CREATE TABLE checklists (
  checklist_id INTEGER PRIMARY KEY,
  contract_type TEXT NOT NULL,         -- Employment, NDA, Service, Lease, Loan, etc.
  item_text TEXT NOT NULL,             -- e.g. "มีข้อเงินเดือน"
  item_category TEXT,                  -- Salary, OT, Leave, Termination
  is_required INTEGER DEFAULT 1,       -- 1 = must have, 0 = recommended
  related_clause_id INTEGER,
  related_law_id INTEGER,
  related_section_id INTEGER,
  risk_level TEXT,                     -- Low/Medium/High/Critical
  notes TEXT,
  FOREIGN KEY (related_clause_id) REFERENCES clauses(clause_id),
  FOREIGN KEY (related_law_id) REFERENCES laws(law_id)
);

-- Standard Contract Templates
CREATE TABLE contract_templates (
  template_id INTEGER PRIMARY KEY,
  contract_type TEXT NOT NULL,
  variant TEXT,                        -- One-way, Mutual, Employee, Supplier, Investor
  title TEXT,
  content TEXT,                        -- Full contract text
  source TEXT,                         -- DBD, BOI, etc.
  source_url TEXT,
  industry TEXT,                       -- General, IT, Healthcare, Construction
  is_anonymized INTEGER DEFAULT 1,
  version TEXT,
  created_at TEXT
);

-- Legal Terminology Dictionary
CREATE TABLE legal_terms (
  term_id INTEGER PRIMARY KEY,
  term_th TEXT NOT NULL,               -- นายจ้าง
  term_en TEXT,                        -- Employer
  synonyms TEXT,                       -- JSON: ["ลูกจ้าง", "Staff", "Personnel"] (for related)
  definition TEXT,
  category TEXT,                       -- Labor, Civil, Criminal, Procedural
  related_law_ids TEXT,                -- JSON array
  related_section_ids TEXT,            -- JSON array
  notes TEXT
);

-- Legal Opinions (จากหน่วยงานรัฐ)
CREATE TABLE legal_opinions (
  opinion_id INTEGER PRIMARY KEY,
  source_agency TEXT,                  -- กฤษฎีกา, กระทรวงแรงงาน, PDPC, กรมสรรพากร
  title TEXT,
  opinion_text TEXT,
  question TEXT,                       -- The question asked
  answer TEXT,                         -- The official answer
  issue_date TEXT,
  source_url TEXT,
  related_law_ids TEXT,
  related_section_ids TEXT,
  tags TEXT
);

-- Industry Rules
CREATE TABLE industry_rules (
  rule_id INTEGER PRIMARY KEY,
  industry TEXT,                       -- Healthcare, Construction, IT, Finance
  rule_text TEXT,
  related_law_ids TEXT,
  typical_clauses TEXT,                -- JSON array of clause_id
  risk_patterns TEXT,                  -- JSON array
  notes TEXT
);

-- ========== Layer 3: Decision Rules ==========

-- Risk Matrix: Risk patterns to detect
CREATE TABLE risk_rules (
  rule_id INTEGER PRIMARY KEY,
  rule_name TEXT NOT NULL,
  rule_description TEXT,
  rule_type TEXT,                      -- Pattern, Clause-Missing, Threshold, Conflict
  pattern TEXT,                        -- Regex or keyword pattern to match
  severity INTEGER,                    -- 1-5 (Negligible to Critical)
  likelihood INTEGER,                  -- 1-5 (Rare to Almost Certain)
  risk_score INTEGER,                  -- severity × likelihood (1-25)
  escalation TEXT,                     -- "lawyer", "executive", "manager", "self"
  related_law_ids TEXT,
  related_section_ids TEXT,
  recommendation TEXT,
  applies_to_contract_types TEXT      -- JSON array
);

-- Citation Graph: Cross-references
CREATE TABLE citation_graph (
  citation_id INTEGER PRIMARY KEY,
  source_type TEXT,                    -- section, judgment, opinion, clause
  source_id INTEGER,
  target_type TEXT,
  target_id INTEGER,
  relation_type TEXT,                  -- cites, interprets, contradicts, amends
  notes TEXT
);

-- ========== System ==========
CREATE TABLE schema_version (
  version TEXT PRIMARY KEY,
  applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);
```

---

## 5. Risk Matrix & Escalation Rules

### 5.1 Severity Scale
| Level | Name | Description |
|-------|------|-------------|
| 1 | Negligible | Minor inconvenience, no legal impact |
| 2 | Minor | Slight contractual gap, easily fixed |
| 3 | Moderate | Missing recommended clause, low litigation risk |
| 4 | Major | Likely violates law, litigation risk |
| 5 | Critical | Clearly illegal, criminal liability possible |

### 5.2 Likelihood Scale
| Level | Name | Description |
|-------|------|-------------|
| 1 | Rare | < 5% chance of issue materializing |
| 2 | Unlikely | 5-25% |
| 3 | Possible | 25-50% |
| 4 | Likely | 50-75% |
| 5 | Almost Certain | > 75% |

### 5.3 Risk Score = Severity × Likelihood (1-25)
| Score | Action | Escalation |
|-------|--------|-----------|
| 1-5 | OK to use | None |
| 6-10 | Recommend revision | Manager |
| 11-15 | Send to legal team | Legal department |
| 16-20 | Send to executive + legal | Executive + Legal |
| 21-25 | Must be reviewed by lawyer | Lawyer (mandatory) |

### 5.4 Common Risk Patterns (Thai Law)

| Pattern | Severity | Why |
|---------|----------|-----|
| ห้ามลาออก (No resignation allowed) | 5 | Illegal under LPA |
| ยึดบัตรประชาชน (Confiscate ID card) | 5 | Illegal |
| ปรับลูกจ้าง (Fine employee) | 4 | Likely violates LPA |
| ห้ามแต่งงาน/ตั้งครรภ์ (No marriage/pregnancy) | 5 | Discrimination, illegal |
| Non-compete > 5 years | 4 | Likely "excessive" per ป.พ.พ. มาตรา 168 |
| NDA unlimited duration | 3 | May be unreasonable |
| Waive all employee rights | 5 | Void under LPA |
| No PDPA clause in employment contract | 3 | Likely PDPA violation |
| No Force Majeure clause | 2 | Recommended best practice |
| No Termination clause | 3 | Default rules apply but unclear |
| Penalty > actual damage | 3 | May be reduced by court |
| One-sided termination (only employer) | 3 | Unfair under UCTA |

---

## 6. Contract Type Ontology

```
Contract
├── Employment
│   ├── Permanent
│   ├── Probation
│   ├── Fixed-term
│   └── Part-time
├── NDA
│   ├── One-way
│   ├── Mutual
│   ├── Employee
│   ├── Supplier
│   └── Investor
├── Service Agreement
│   ├── IT/Software
│   ├── Consultant
│   ├── SaaS
│   └── Maintenance
├── Purchase Agreement
│   ├── Goods
│   ├── Real Estate
│   └── Asset
├── Lease
│   ├── Commercial (พ.ร.บ. 2542)
│   ├── Residential (พ.ร.บ. 2504)
│   └── Land
├── Loan
│   ├── With interest
│   ├── Without interest
│   └── Secured
├── Shareholder Agreement
├── Joint Venture
├── Franchise
├── Distribution
├── Agency
├── Outsourcing
├── SaaS / Software License
└── MOU / LOI
```

---

## 7. Legal Issue Taxonomy

```
Employment
├── Termination (Resignation, Dismissal, Severance)
├── Probation
├── Leave (Sick, Maternity, Annual)
├── Overtime
├── Wage & Salary
├── Benefits & Welfare
├── Non-Compete
├── Confidentiality
└── Dispute

Contract
├── Offer & Acceptance
├── Consideration
├── Breach
├── Remedy
├── Termination
├── Assignment
└── Novation

Civil Liability
├── Tort (ละเมิด)
├── Warranty
├── Indemnity
└── Limitation of Liability

Criminal (contract-related)
├── Fraud (ฉ้อโกง)
├── Embezzlement (ยักยอก)
├── Forgery (ปลอมเอกสาร)
└── Defamation (หมิ่นประมาท)
```

---

## 8. Data Fetch Workflow

### Step 1: Fetch Statutory Texts (Tier 1 — Critical)

For laws on PyThaiNLP Hugging Face (fastest):
```python
from datasets import load_dataset
ds = load_dataset("pythainlp/thailaw", split="train")
# Search by sysid or title
```

For laws NOT on PyThaiNLP, use law.go.th via browser automation:
- Navigate to `https://law.go.th/DetailLawPage?table_of_law_id=XXXX`
- Select the latest consolidated version
- Extract all section texts
- Download PDF/DOCX if available

**Note:** law.go.th blocks `fetch_url` via robots.txt. Must use `browser_task` (Playwright).

### Step 2: Fetch Case Law (Tiered)

Priority order:
1. **Labor cases (1,000-2,000)** — from deka.in.th (login required) or ops.mol.go.th
2. **Civil contract cases (2,000-5,000)** — from deka.supremecourt.or.th
3. **Criminal contract-related (500-1,000)** — from deka.supremecourt.or.th

**Tag by issue** (not random download):
- จ้างแรงงาน, ซื้อขาย, เช่า, กู้ยืม, ค้ำประกัน, ตัวแทน, นายหน้า, จ้างทำของ
- หุ้นส่วน, บริษัท, ละเมิด, ฉ้อโกง, ยักยอก

### Step 3: Build Knowledge Layer

#### Clause Library (300-500 clauses)
- Standard clause names: Termination, Force Majeure, Confidentiality, IP Ownership, Non-Compete, Non-Solicitation, Payment, Warranty, Indemnity, Limitation of Liability, Assignment, Severability, Entire Agreement, Jurisdiction, Governing Law, Notice, Penalty, Liquidated Damage, Inspection, Acceptance, Change Order, Escrow, Data Protection, PDPA, Security, Compliance, Audit Right, Arbitration
- For each: Purpose, Mandatory?, Risk if missing, Related law, Related cases, Sample good, Sample bad

#### Compliance Checklists (per contract type)
- Employment: Probation, Salary, OT, Leave, Welfare, Confidentiality, PDPA, Termination, Notice, Governing Law
- NDA: Confidential Information, Exceptions, Duration, Return of Document, Governing Law
- Lease: Rent, Deposit, Repair, Termination, Handover
- Loan: Principal, Interest, Repayment, Default, Security

#### Risk Rules
- IF Penalty > Actual Damage → Critical
- IF No Governing Law → Medium
- IF Waive Employee Rights → Critical
- IF No PDPA → High
- IF Non-compete > 5 years → High

### Step 4: Build RAG Chunks

For each section/judgment/opinion/clause — create 1 chunk in `rag_chunks` table.

---

## 9. Deployment — Vercel + Turso (Recommended)

**Important:** SQLite files do NOT work on Vercel serverless — no persistent filesystem. Must migrate to a serverless SQLite-compatible DB.

### 9.1 Why Turso?
- SQLite-compatible (minimal Prisma schema changes)
- Free tier: 500 databases, 9 GB total, 1 billion row reads/month
- Edge network (low latency globally)
- Easy migration from local SQLite file

### 9.2 Migration Steps

```bash
# 1. Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# 2. Login + create database
turso auth login
turso db create panya-ai --location sin

# 3. Get connection string + token
turso db show panya-ai --url
turso db tokens create panya-ai

# 4. Import existing SQLite data
turso db shell panya-ai < prisma/thai_legal_db.sqlite

# 5. Update .env
DATABASE_URL=libsql://panya-ai-<your-account>.turso.io
TURSO_AUTH_TOKEN=<your-token>

# 6. Switch Prisma to libsql driver
# In schema.prisma: datasource db { provider = "libsql" ... }
# Install: bun add @prisma/adapter-libsql @libsql/client
```

### 9.3 Vercel Deployment

1. Push code to GitHub
2. Go to vercel.com → Import Project → Select GitHub repo
3. Set Environment Variables:
   - `DATABASE_URL` = libsql://...turso.io
   - `TURSO_AUTH_TOKEN` = ...
   - `Z_AI_API_KEY` = (for AI features)
4. Deploy

### 9.4 Alternative: Supabase (PostgreSQL)

If you prefer PostgreSQL, use Supabase instead:
- Free tier: 500 MB database, 50,000 monthly active users
- Requires Prisma schema migration (sqlite → postgresql types)

---

## 10. License & Compliance Notes

| Source | License | Commercial use? |
|--------|---------|----------------|
| law.go.th content | Public domain (gov publication) | ✅ Yes |
| Supreme Court judgments | Public domain | ✅ Yes |
| PyThaiNLP/thai-law | Public domain | ✅ Yes |
| TSCC Dataset | **Academic only** | ❌ **NO — RAG use only, do NOT redistribute, do NOT train models** |
| ThaiDeka (deka.in.th) | Verify terms — full text requires login | ⚠️ Verify |
| Open Law Data Thailand | Per-document — verify each | ⚠️ Verify |
| Standard contract templates (DBD, BOI) | Usually public domain (gov) | ✅ Generally yes |
| Sample contracts (anonymized) | Owned by contributor | ⚠️ Verify |

**For commercial deployment:**
- ❌ Do NOT include TSCC data in production database
- ✅ Use only deka.in.th / ops.mol.go.th / law.go.th content for commercial
- ⚠️ Always display source attribution for every citation
- ⚠️ Add disclaimer: "AI provides information for educational purposes, not legal advice"

---

## 11. Update & Versioning Strategy

### 11.1 Why Versioning Matters
- Thai law amends frequently (e.g., LPA was amended in 2568)
- New Supreme Court decisions every month
- PDPC announces new guidelines periodically
- AI must know which version it's citing

### 11.2 Recommended Versioning
- Every record has: `effective_date`, `repealed_date`, `version`, `source_url`
- Run update pipeline monthly
- Tag records with `as_of_date` for queries
- Display "ข้อมูล ณ วันที่ YYYY-MM-DD" in AI responses

---

## 12. Examples

### Example 1: Find unfair contract term risk
```sql
SELECT r.rule_name, r.severity, r.likelihood, r.risk_score, r.recommendation
FROM risk_rules r
WHERE r.applies_to_contract_types LIKE '%Employment%'
  AND r.severity >= 4
ORDER BY r.risk_score DESC;
```

### Example 2: Find all clauses for Employment contract
```sql
SELECT c.clause_name, c.sample_good, c.risk_if_missing, c.related_law_ids
FROM clauses c
WHERE c.category = 'Employment'
ORDER BY c.mandatory DESC, c.clause_name;
```

### Example 3: Get checklist for NDA review
```sql
SELECT ck.item_text, ck.is_required, ck.risk_level, c.clause_name
FROM checklists ck
LEFT JOIN clauses c ON ck.related_clause_id = c.clause_id
WHERE ck.contract_type = 'NDA'
ORDER BY ck.is_required DESC, ck.checklist_id;
```

### Example 4: Find Supreme Court cases on non-compete
```sql
SELECT j.case_number, j.case_year, j.fact, j.decision
FROM case_judgments j
WHERE j.law_references LIKE '%แข่งขัน%'
   OR j.law_references LIKE '%Non-Compete%'
   OR j.fact LIKE '%แข่งขันทางการค้า%'
ORDER BY j.case_year DESC
LIMIT 20;
```

---

## 13. Roadmap — From Current State to Enterprise

### Phase 1: Current (✅ Done)
- 14 laws, 4,441 sections, 1,258 judgments
- FTS5 search
- AI RAG with citation
- Next.js web app

### Phase 2: Tier 1 Expansion (2-4 weeks)
- Add 11 new Tier 1 laws (Unfair Contract Terms Act, PDPA, Trade Secrets Act, etc.)
- Add 1,000+ more labor judgments
- Add Labor Court judgments (not just ฎีกา)
- Add 100+ government legal opinions

### Phase 3: Knowledge Layer (4-8 weeks)
- Build Clause Library (300+ clauses with metadata)
- Build Compliance Checklists (10+ contract types)
- Build Risk Rules (50+ patterns)
- Build Standard Contract Templates (50+ templates)

### Phase 4: Enterprise Features (8-16 weeks)
- Legal Knowledge Graph
- Citation Graph
- Legal Issue Taxonomy with ML classification
- Industry Rules (5+ industries)
- Anonymized Contract Dataset (300-500 samples)

### Phase 5: Deployment & Scale
- Turso/Supabase backend
- Vercel deployment
- CI/CD with auto-data-update pipeline
- Monitoring & analytics

---

## 14. File Structure (Reference)

```
panya-ai/
├── prisma/
│   ├── schema.prisma              # Current (SQLite file)
│   └── schema.turso.prisma        # Vercel variant (libsql)
├── scripts/
│   ├── rebuild_legal_db.py        # Build SQLite from sources
│   ├── import_to_turso.sh         # Migrate to Turso
│   └── fetch_*.py                 # Per-source fetchers
├── src/
│   ├── app/
│   │   ├── api/                   # 7+ API routes
│   │   └── page.tsx               # Main SPA
│   ├── components/
│   └── lib/
│       ├── rag.ts                 # RAG retrieval
│       └── types.ts
├── data/                          # Generated (gitignored)
│   └── thai_legal_db.sqlite
├── knowledge/                     # Knowledge Layer data (JSON)
│   ├── clauses.json
│   ├── checklists.json
│   ├── risk_rules.json
│   └── contract_templates/
├── .env.example
├── .gitignore
├── README.md
├── DEPLOYMENT.md
├── SKILL.md                       # This file
└── package.json
```

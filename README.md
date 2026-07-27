# 🇹🇭 Panya-AI — ฐานข้อมูลกฎหมายไทย + AI ตรวจสัญญา

> เว็บแอปฐานข้อมูลกฎหมายไทย พร้อม AI RAG ถาม-ตอบพร้อมอ้างอิงมาตรา/ฎีกา
> ออกแบบมาเพื่อการตรวจสอบสัญญา ประเมินความเสี่ยงทางกฎหมาย และค้นหาข้อมูลกฎหมาย

🔗 **Live demo:** (deploy บน Vercel ตามคู่มือใน [DEPLOYMENT.md](./DEPLOYMENT.md))

---

## ✨ Features

### 📊 Dashboard สถิติ
- กฎหมาย 14 ฉบับ · 4,441 มาตรา · 1,258 คำพิพากษาฎีกา
- มาตราแรงงานที่ tagged 797 มาตรา
- ค้นหา/กรองตามหมวดกฎหมาย

### 🔍 Search (FTS5 + LIKE fallback)
- ค้นหาในมาตรากฎหมาย 4,441 มาตรา
- ค้นหาในคำพิพากษาฎีกา 1,258 เรื่อง
- ค้นหาตามชื่อกฎหมาย
- Highlight คำค้นในผลลัพธ์
- รองรับภาษาไทย (FTS5 + LIKE fallback สำหรับคำไทยที่ไม่มี word boundary)

### 📜 Law Detail
- ดูมาตราทั้งหมดของแต่ละกฎหมาย
- ค้นหาในมาตราของกฎหมายนั้น
- Filter เฉพาะมาตราแรงงาน
- ลิงก์ไปยัง law.go.th ฉบับเต็ม

### ⚖️ Section Detail + ฎีกาที่เกี่ยวข้อง
- ดูเนื้อมาตราฉบับเต็ม
- แสดงฎีกาที่อ้างถึงมาตรานั้น (via case_law_links)
- License note (TSCC academic use warning)

### 🏛️ Judgment Detail + Citation
- ข้อเท็จจริง/คำพิพากษา
- กฎหมายที่อ้างอิง (law_references)
- มาตราที่เกี่ยวข้อง (related sections)
- แสดงแหล่งที่มา + License warning

### 💬 AI RAG Chat (ถาม-ตอบพร้อม Citation)
- ถามเป็นภาษาธรรมดา "นายจ้างเลิกจ้างโดยไม่เตือนล่วงหน้า ลูกจ้างมีสิทธิอะไรบ้าง?"
- AI ตอบพร้อมอ้างอิง [1], [2], ... จากฐานข้อมูลจริง
- Citation panel แสดงมาตรา/ฎีกาที่ใช้ (click เพื่อดูรายละเอียด)
- โฟกัสเฉพาะกฎหมายแรงงานได้
- ใช้ `z-ai-web-dev-sdk` LLM

### 🔖 Bookmark
- บันทึก มาตรา/ฎีกา/กฎหมายที่สนใจ
- เก็บใน localStorage (ไม่ต้อง login)

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Database | SQLite (dev) / Turso libSQL (Vercel prod) |
| ORM | Prisma 6 |
| AI | z-ai-web-dev-sdk (Z.ai LLM) |
| Fonts | Noto Sans Thai + Noto Serif Thai |
| Icons | lucide-react |
| State | React hooks + localStorage |

---

## 📦 Project Structure

```
panya-ai/
├── prisma/
│   ├── schema.prisma              # Prisma schema (SQLite)
│   └── thai_legal_db.sqlite       # Generated DB (gitignored)
├── scripts/
│   ├── rebuild_legal_db.py        # Build SQLite from sources
│   └── test-*.ts                  # Test scripts
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── stats/             # Dashboard stats
│   │   │   ├── laws/              # Law list + detail
│   │   │   ├── sections/          # Section detail + related judgments
│   │   │   ├── judgments/         # Judgment list + detail
│   │   │   ├── search/            # FTS5 + LIKE fallback
│   │   │   └── ask/               # AI RAG chat
│   │   ├── globals.css            # Dark premium theme
│   │   ├── layout.tsx
│   │   └── page.tsx               # Main SPA entry
│   ├── components/
│   │   ├── AppShell.tsx           # View router
│   │   ├── layout/Header.tsx      # Sticky header + nav
│   │   ├── home/                  # Dashboard
│   │   ├── law/                   # Law + section views
│   │   ├── judgment/              # Judgment views
│   │   ├── search/                # Search view
│   │   ├── chat/                  # AI RAG chat
│   │   └── common/                # Bookmark, etc.
│   └── lib/
│       ├── db.ts                  # Prisma client
│       ├── rag.ts                 # RAG retrieval + context builder
│       ├── types.ts
│       └── navigation.ts          # SPA navigation + bookmark hooks
├── data/                          # Source data (gitignored)
├── SKILL.md                       # Comprehensive skill documentation
├── DEPLOYMENT.md                  # Vercel + Turso deployment guide
├── .env.example
└── package.json
```

---

## 🚀 Quickstart (Local Development)

### Prerequisites
- Node.js 20+ or Bun
- Python 3.10+ (for DB rebuild script)
- SQLite3

### 1. Clone & Install

```bash
git clone https://github.com/<your-username>/panya-ai.git
cd panya-ai
bun install  # or npm install
```

### 2. Build the Database

The 22 MB SQLite database is **NOT committed** to git (too large, regenerated from sources).

**Option A:** Use the included source DB (if you have it)
```bash
mkdir -p data
# Place your source SQLite at data/thai_legal_db.sqlite
# Or run the rebuild script below
```

**Option B:** Rebuild from sources (recommended)
```bash
# Install Python deps
pip install -r scripts/requirements.txt

# Run rebuild
python scripts/rebuild_legal_db.py
# → outputs to data/thai_legal_db.sqlite
```

The rebuild script:
- Parses 14 Thai laws from `laws.full_text`
- Tags 797 labor-related sections
- Builds FTS5 indexes for full-text search
- Builds RAG chunks (5,670 chunks)
- Re-links case_law_links from law_references

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your database path + Z.AI API key
```

### 4. Setup Prisma

```bash
# Copy DB to Prisma location
mkdir -p db
cp data/thai_legal_db.sqlite db/custom.db

# Generate Prisma client
bun run db:generate
```

### 5. Run Dev Server

```bash
bun run dev
# Open http://localhost:3000
```

---

## 🌐 Deploy to Vercel

⚠️ **SQLite files don't work on Vercel** — serverless has no persistent filesystem.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full Vercel + Turso migration guide.

**TL;DR:**
1. Create Turso database (free tier)
2. Import SQLite data to Turso
3. Switch Prisma to libsql driver
4. Push to GitHub
5. Import to Vercel
6. Set env vars + deploy

---

## 📋 Available Scripts

```bash
bun run dev          # Start dev server (port 3000)
bun run build        # Production build
bun run start        # Start production server
bun run lint         # ESLint
bun run db:generate  # Generate Prisma client
bun run db:push      # Push schema to DB
bun run db:migrate   # Run migrations
```

---

## 📊 Database Statistics (current)

| Stat | Value |
|------|-------|
| กฎหมาย | 14 ฉบับ |
| มาตราทั้งหมด | 4,441 |
| มาตราแรงงาน (tagged) | 797 |
| คำพิพากษาฎีกาแรงงาน | 51 |
| คำพิพากษาฎีกาอาญา (TSCC) | 1,207 |
| case_law_links | 26 |
| RAG chunks | 5,670 |
| DB size | 22 MB |

---

## 📚 Data Sources

| Source | License | Use |
|--------|---------|-----|
| law.go.th (กฤษฎีกา) | Public domain (gov) | Law texts |
| PyThaiNLP/thai-law | Public domain | CCC + Penal Code CSVs |
| deka.in.th | Verify terms | Labor judgments (login required for full text) |
| ops.mol.go.th | Public domain (gov) | Labor judgments |
| TSCC Dataset | **Academic use only** | Criminal judgments (RAG only, no commercial use) |

See [SKILL.md](./SKILL.md) for full source list and licensing notes.

---

## ⚠️ Disclaimer

This application is for **educational purposes only**. It is not legal advice.

- AI responses are generated based on database content — always verify against original sources
- TSCC dataset judgments are for academic use only — do not use commercially
- For real legal matters, consult a licensed Thai lawyer
- Data accuracy depends on source freshness — verify the latest version of any law before relying on it

---

## 🗺 Roadmap

See [SKILL.md §13](./SKILL.md) for full roadmap.

- ✅ Phase 1: 14 laws + 1,258 judgments + AI RAG (current)
- 🚧 Phase 2: Add 11+ more laws (PDPA, UCTA, Trade Secrets, etc.)
- 📋 Phase 3: Knowledge Layer (Clause Library, Checklists, Risk Matrix)
- 🎯 Phase 4: Enterprise (Legal Knowledge Graph, Citation Graph, Industry Rules)
- 🚀 Phase 5: Vercel + Turso production deployment

---

## 📄 License

MIT License — see [LICENSE](./LICENSE)

Data sources retain their original licenses (see above). This code is MIT.

---

## 🙏 Acknowledgments

- [PyThaiNLP](https://github.com/PyThaiNLP/thai-law) for law text datasets
- [Council of State (กฤษฎีกา)](https://law.go.th) for official law texts
- [Supreme Court of Thailand](https://deka.supremecourt.or.th) for judgments
- [Ministry of Labor](https://ops.mol.go.th) for labor judgments
- [TSCC Dataset](https://github.com/KevinMercury/tscc-dataset) for criminal case research data

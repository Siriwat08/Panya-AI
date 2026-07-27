#!/usr/bin/env python3
"""
Thai Legal Database - Build Script
สร้างฐานข้อมูลกฎหมายไทยจากหลายแหล่งข้อมูล

Sources:
- law.go.th API (apig.law.go.th)
- PyThaiNLP/thai-law (Hugging Face + GitHub)
- TSCC Dataset (GitHub)
- ThaiDeka (deka.in.th)
- กระทรวงแรงงาน (ops.mol.go.th)

Usage:
    python3 build_legal_database.py
"""

import sqlite3
import os
import json
import re
import csv
import urllib.request
import urllib.error

DB_PATH = 'thai_legal_database.sqlite'
LAW_TEXTS_DIR = 'law_texts'

# ============================================================
# DATABASE SCHEMA
# ============================================================

SCHEMA = """
CREATE TABLE IF NOT EXISTS sources (
    source_id INTEGER PRIMARY KEY,
    source_name TEXT NOT NULL,
    source_type TEXT,
    source_url TEXT,
    description TEXT
);

CREATE TABLE IF NOT EXISTS laws (
    law_id INTEGER PRIMARY KEY,
    law_name_th TEXT NOT NULL,
    law_name_en TEXT,
    year TEXT,
    krisdika_sysid TEXT,
    law_go_th_id TEXT,
    source_url TEXT,
    status TEXT DEFAULT 'pending',
    full_text TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS law_sections (
    section_id INTEGER PRIMARY KEY AUTOINCREMENT,
    law_id INTEGER NOT NULL,
    article_key TEXT,
    section_number TEXT,
    section_text TEXT NOT NULL,
    notes TEXT,
    is_cancelled BOOLEAN DEFAULT 0,
    chapter TEXT,
    FOREIGN KEY (law_id) REFERENCES laws(law_id)
);

CREATE TABLE IF NOT EXISTS case_judgments (
    judgment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_number TEXT,
    case_year TEXT,
    court TEXT,
    category TEXT,
    category_code TEXT,
    issue_number TEXT,
    law_references TEXT,
    fact TEXT,
    decision TEXT,
    source_id INTEGER,
    source_url TEXT,
    FOREIGN KEY (source_id) REFERENCES sources(source_id)
);

CREATE TABLE IF NOT EXISTS case_law_links (
    link_id INTEGER PRIMARY KEY AUTOINCREMENT,
    judgment_id INTEGER,
    section_id INTEGER,
    law_id INTEGER,
    FOREIGN KEY (judgment_id) REFERENCES case_judgments(judgment_id),
    FOREIGN KEY (section_id) REFERENCES law_sections(section_id),
    FOREIGN KEY (law_id) REFERENCES laws(law_id)
);

CREATE TABLE IF NOT EXISTS ingestion_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT,
    record_count INTEGER,
    source_file TEXT,
    notes TEXT
);
"""

# ============================================================
# 14 LAWS
# ============================================================

LAWS = [
    (1, 'พระราชบัญญัติคุ้มครองแรงงาน พ.ศ. 2541', 'Labor Protection Act', '2541', '642571', '8876', 'https://law.go.th/DetailLawPage?table_of_law_id=8876'),
    (2, 'ประมวลกฎหมายแพ่งและพาณิชย์', 'Civil and Commercial Code', '2468', None, '9087', 'https://law.go.th/DetailLawPage?table_of_law_id=9087'),
    (3, 'ประมวลกฎหมายอาญา', 'Penal Code', '2499', None, '9186', 'https://law.go.th/DetailLawPage?table_of_law_id=9186'),
    (4, 'พระราชบัญญัติประกันสังคม พ.ศ. 2533', 'Social Security Act', '2533', None, '8832', 'https://law.go.th/DetailLawPage?table_of_law_id=8832'),
    (5, 'พระราชบัญญัติเงินทดแทน พ.ศ. 2537', 'Compensation Act', '2537', '393337', '8622', 'https://law.go.th/DetailLawPage?table_of_law_id=8622'),
    (6, 'พระราชบัญญัติแรงงานสัมพันธ์ พ.ศ. 2518', 'Labor Relations Act', '2518', None, '8637', 'https://law.go.th/DetailLawPage?table_of_law_id=8637'),
    (7, 'พระราชบัญญัติคุ้มครองผู้รับงานไปทำที่บ้าน พ.ศ. 2553', 'Home Worker Protection Act', '2553', '773823', '9413', 'https://law.go.th/DetailLawPage?table_of_law_id=9413'),
    (8, 'พระราชบัญญัติจัดหางานและคุ้มครองคนหางาน พ.ศ. 2528', 'Employment Promotion and Protection Act', '2528', '316918', '9383', 'https://law.go.th/DetailLawPage?table_of_law_id=9383'),
    (9, 'ประมวลกฎหมายวิธีพิจารณาความแพ่ง', 'Civil Procedure Code', '2478', None, '8465', 'https://law.go.th/DetailLawPage?table_of_law_id=8465'),
    (10, 'ประมวลกฎหมายที่ดิน', 'Land Code', '2497', None, '9057', 'https://law.go.th/DetailLawPage?table_of_law_id=9057'),
    (11, 'พระราชบัญญัติควบคุมการเช่าเคหะและที่ดิน พ.ศ. 2504', 'Rent Control Act', '2504', None, '12070', 'https://law.go.th/DetailLawPage?table_of_law_id=12070'),
    (12, 'ประมวลกฎหมายวิธีพิจารณาความอาญา', 'Criminal Procedure Code', '2478', None, '9280', 'https://law.go.th/DetailLawPage?table_of_law_id=9280'),
    (13, 'พระราชบัญญัติยาเสพติดให้โทษ พ.ศ. 2522', 'Narcotics Act', '2522', '342773', '12051', 'https://law.go.th/DetailLawPage?table_of_law_id=12051'),
    (14, 'พระราชบัญญัติจราจรทางบก พ.ศ. 2522', 'Land Traffic Act', '2522', '570840', '9364', 'https://law.go.th/DetailLawPage?table_of_law_id=9364'),
]

SOURCES = [
    (1, 'สำนักงานคณะกรรมการกฤษฎีกา', 'government', 'https://krisdika.go.th', 'แหล่งข้อมูลกฎหมายหลักของรัฐ'),
    (2, 'PyThaiNLP/thai-law (Hugging Face)', 'dataset', 'https://huggingface.co/datasets/PyThaiNLP/thai-law', 'ชุดข้อมูลกฎหมายไทย'),
    (3, 'PyThaiNLP/thai-law (GitHub Releases)', 'dataset', 'https://github.com/PyThaiNLP/thai-law', 'ซอร์สโค้ดและไฟล์กฎหมาย'),
    (4, 'TSCC Dataset (GitHub)', 'dataset', 'https://github.com/...', 'Thai Supreme Court Criminal cases'),
    (5, 'ระบบสืบค้นคำพิพากษาศาลฎีกา', 'government', 'https://deka.supremecourt.or.th/', 'ฐานข้อมูลคำพิพากษาฎีกา'),
    (6, 'กระทรวงแรงงาน - คำพิพากษาคดีแรงงาน', 'government', 'https://ops.mol.go.th/sentence', 'คำพิพากษาคดีแรงงาน'),
    (7, 'Open Law Data Thailand', 'dataset', 'https://github.com/...', 'ข้อมูลกฎหมายเปิด'),
    (8, 'WangchanX-Legal-ThaiCCL-RAG', 'dataset', 'https://github.com/...', 'ชุดข้อมูลกฎหมายไทย'),
    (9, 'ThaiDeka (deka.in.th)', 'web', 'https://deka.in.th/', 'ฐานข้อมูลคำพิพากษาฎีกาไทย'),
]

# ============================================================
# BUILD FUNCTIONS
# ============================================================

def create_database():
    """Create database with schema"""
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(SCHEMA)
    conn.commit()
    return conn

def insert_sources(conn):
    """Insert source records"""
    cur = conn.cursor()
    for s in SOURCES:
        cur.execute("INSERT OR IGNORE INTO sources VALUES (?, ?, ?, ?, ?)", s)
    conn.commit()

def insert_laws(conn):
    """Insert law records"""
    cur = conn.cursor()
    for law in LAWS:
        cur.execute("""
            INSERT OR IGNORE INTO laws 
            (law_id, law_name_th, law_name_en, year, krisdika_sysid, law_go_th_id, source_url, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        """, law)
    conn.commit()

def parse_law_text_file(conn, law_id, file_path):
    """Parse a law text file and insert sections"""
    if not os.path.exists(file_path):
        return 0
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    cur = conn.cursor()
    sections_inserted = 0
    current_article = None
    current_text = []
    in_sections = False
    
    for line in lines:
        stripped = line.strip()
        
        # Handle === SECTIONS === marker (format 1)
        if '=== SECTIONS' in stripped:
            in_sections = True
            continue
        
        if not in_sections:
            # Check if line starts with มาตรา directly (format 2 - no marker)
            if stripped.startswith('มาตรา') and ':' in stripped:
                in_sections = True
            else:
                continue
        
        if stripped.startswith('มาตรา') and ':' in stripped:
            # Save previous section
            if current_article and current_text:
                text = ' '.join(current_text).strip()[:10000]
                if len(text) > 3:
                    try:
                        cur.execute("""
                            INSERT INTO law_sections (law_id, article_key, section_number, section_text, notes, is_cancelled)
                            VALUES (?, ?, ?, ?, NULL, 0)
                        """, (law_id, current_article, current_article.replace('มาตรา ', ''), text))
                        sections_inserted += 1
                    except:
                        pass
            
            colon_pos = stripped.index(':')
            current_article = stripped[:colon_pos].strip()
            rest = stripped[colon_pos+1:].strip()
            current_text = [rest] if rest else []
        elif stripped.startswith('[') and ']' in stripped and ':' in stripped:
            # [type]: header - save previous, reset
            if current_article and current_text:
                text = ' '.join(current_text).strip()[:10000]
                if len(text) > 3:
                    try:
                        cur.execute("""
                            INSERT INTO law_sections (law_id, article_key, section_number, section_text, notes, is_cancelled)
                            VALUES (?, ?, ?, ?, NULL, 0)
                        """, (law_id, current_article, current_article.replace('มาตรา ', ''), text))
                        sections_inserted += 1
                    except:
                        pass
            current_article = None
            current_text = []
        elif not stripped:
            if current_article and current_text:
                text = ' '.join(current_text).strip()[:10000]
                if len(text) > 3:
                    try:
                        cur.execute("""
                            INSERT INTO law_sections (law_id, article_key, section_number, section_text, notes, is_cancelled)
                            VALUES (?, ?, ?, ?, NULL, 0)
                        """, (law_id, current_article, current_article.replace('มาตรา ', ''), text))
                        sections_inserted += 1
                    except:
                        pass
            current_article = None
            current_text = []
        else:
            if current_article:
                current_text.append(stripped)
    
    # Save last section
    if current_article and current_text:
        text = ' '.join(current_text).strip()[:10000]
        if len(text) > 3:
            try:
                cur.execute("""
                    INSERT INTO law_sections (law_id, article_key, section_number, section_text, notes, is_cancelled)
                    VALUES (?, ?, ?, ?, NULL, 0)
                """, (law_id, current_article, current_article.replace('มาตรา ', ''), text))
                sections_inserted += 1
            except:
                pass
    
    # Update law status
    cur.execute("UPDATE laws SET status = 'available' WHERE law_id = ?", (law_id,))
    conn.commit()
    return sections_inserted

def load_csv_sections(conn, csv_path, law_id):
    """Load sections from CSV file (PyThaiNLP format)"""
    if not os.path.exists(csv_path):
        return 0
    
    cur = conn.cursor()
    count = 0
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            article = row.get('article', row.get('section_number', ''))
            text = row.get('text', row.get('section_text', ''))
            if article and text:
                try:
                    cur.execute("""
                        INSERT INTO law_sections (law_id, article_key, section_number, section_text, notes, is_cancelled)
                        VALUES (?, ?, ?, ?, NULL, 0)
                    """, (law_id, f"มาตรา {article}", article, text[:10000]))
                    count += 1
                except:
                    pass
    
    cur.execute("UPDATE laws SET status = 'available' WHERE law_id = ?", (law_id,))
    conn.commit()
    return count

def load_judgments(conn, json_path):
    """Load Supreme Court judgments from JSON"""
    if not os.path.exists(json_path):
        return 0
    
    cur = conn.cursor()
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    count = 0
    for j in data.get('judgments', []):
        source_id = 9 if j.get('source') == 'deka.in.th' else 6
        try:
            cur.execute("""
                INSERT INTO case_judgments 
                (case_number, case_year, court, category, category_code, law_references, fact, decision, source_id, source_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                j['case_number'], j['year'], 'ศาลฎีกา',
                j['category'], j.get('category_code', ''),
                j.get('law_refs', ''), j.get('summary', ''),
                j.get('title', ''), source_id, j.get('url', '')
            ))
            count += 1
        except:
            pass
    
    conn.commit()
    return count

def tag_labor_sections(conn):
    """Tag labor-related sections"""
    cur = conn.cursor()
    
    # Tag all sections in labor-specific laws
    for law_id in [1, 4, 5, 6, 7, 8]:
        cur.execute("""
            UPDATE law_sections 
            SET notes = COALESCE(notes || ' | ', '') || 'labor-law'
            WHERE law_id = ? AND (notes IS NULL OR notes NOT LIKE '%labor%')
        """, (law_id,))
    
    # Tag labor sections from JSON
    json_path = os.path.join(LAW_TEXTS_DIR, 'labor_related_sections_in_other_laws.json')
    if os.path.exists(json_path):
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Civil Code (law_id=2)
        for section in data.get('civil_code_labor_sections', []):
            article_num = section['article_key']
            for num_variant in [article_num, _to_thai_num(article_num)]:
                cur.execute("""
                    UPDATE law_sections 
                    SET notes = COALESCE(notes || ' | ', '') || 'labor-related'
                    WHERE law_id = 2 AND section_number = ?
                """, (num_variant,))
        
        # Criminal Code (law_id=3)
        for section in data.get('criminal_code_labor_sections', []):
            article_num = section['article_key']
            for num_variant in [article_num, _to_thai_num(article_num)]:
                cur.execute("""
                    UPDATE law_sections 
                    SET notes = COALESCE(notes || ' | ', '') || 'labor-related'
                    WHERE law_id = 3 AND section_number = ?
                """, (num_variant,))
    
    conn.commit()

def _to_thai_num(text):
    """Convert Arabic numerals to Thai numerals"""
    mapping = {'0':'๐','1':'๑','2':'๒','3':'๓','4':'๔','5':'๕','6':'๖','7':'๗','8':'๘','9':'๙'}
    for a, t in mapping.items():
        text = text.replace(a, t)
    return text

# ============================================================
# MAIN
# ============================================================

def main():
    print("=== Thai Legal Database Build ===")
    
    conn = create_database()
    
    # 1. Sources
    insert_sources(conn)
    print(f"Sources: {len(SOURCES)}")
    
    # 2. Laws
    insert_laws(conn)
    print(f"Laws: {len(LAWS)}")
    
    # 3. Law text files (from law.go.th)
    law_text_files = [
        (4, 'law_texts/law_04_social_security.txt'),
        (6, 'law_texts/law_06_labor_relations.txt'),
        (9, 'law_texts/law_09_civil_procedure.txt'),
        (10, 'law_texts/law_10_land_code.txt'),
        (11, 'law_texts/law_11_rent_control.txt'),
        (12, 'law_texts/law_12_criminal_procedure.txt'),
    ]
    
    total_sections = 0
    for law_id, file_path in law_text_files:
        count = parse_law_text_file(conn, law_id, file_path)
        total_sections += count
        print(f"  Law {law_id}: {count} sections from text file")
    
    # 4. CSV files (from PyThaiNLP)
    csv_files = [
        (2, 'thai-law-codes/civil_commercial_code.csv'),
        (3, 'thai-law-codes/criminal_code.csv'),
    ]
    for law_id, csv_path in csv_files:
        count = load_csv_sections(conn, csv_path, law_id)
        total_sections += count
        print(f"  Law {law_id}: {count} sections from CSV")
    
    print(f"Total sections: {total_sections}")
    
    # 5. Judgments
    judgments_count = load_judgments(conn, 'law_texts/supreme_court_labor_judgments.json')
    print(f"Labor judgments: {judgments_count}")
    
    # 6. Tag labor sections
    tag_labor_sections(conn)
    
    # 7. Final stats
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM laws WHERE status = 'available'")
    print(f"\n=== Final ===")
    print(f"Laws available: {cur.fetchone()[0]}/14")
    cur.execute("SELECT COUNT(*) FROM law_sections")
    print(f"Total sections: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM law_sections WHERE notes LIKE '%labor%'")
    print(f"Labor sections: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM case_judgments")
    print(f"Total judgments: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM case_judgments WHERE category = 'labor'")
    print(f"Labor judgments: {cur.fetchone()[0]}")
    
    db_size = os.path.getsize(DB_PATH)
    print(f"DB size: {db_size/1024/1024:.2f} MB")
    
    conn.close()
    print("\nDone!")

if __name__ == '__main__':
    main()

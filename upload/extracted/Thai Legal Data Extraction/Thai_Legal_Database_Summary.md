# ฐานข้อมูลกฎหมายไทย (Thai Legal Database)

## ภาพรวม

ฐานข้อมูล SQLite ที่รวบรวมกฎหมายไทย 14 ฉบับหลัก คำพิพากษาศาลฎีกา 1,258 เรื่อง และมาตราแรงงานที่เกี่ยวข้อง 308 มาตรา จากแหล่งข้อมูลของสำนักงานคณะกรรมการกฤษฎีกา law.go.th ศาลฎีกา (deka.in.th) กระทรวงแรงงาน และชุดข้อมูลเปิดจาก PyThaiNLP และ TSCC Dataset

**ไฟล์ฐานข้อมูล:** `thai_legal_database.sqlite` (9.66 MB)

---

## สถิติฐานข้อมูล

| รายการ | จำนวน |
|--------|--------|
| กฎหมาย (พร้อมเนื้อหา) | 14/14 ฉบับ |
| มาตราทั้งหมด | 3,718 มาตรา |
| มาตราแรงงาน (tagged) | 308 มาตรา |
| ฎีกาแรงงาน | 51 เรื่อง |
| ฎีกาอาญา (TSCC) | 1,207 เรื่อง |
| คำพิพากษารวม | 1,258 เรื่อง |

---

## โครงสร้างฐานข้อมูล

### ตารางหลัก 6 ตาราง

| ตาราง | คำอธิบาย | จำนวนระเบียน |
|-------|----------|-------------|
| `sources` | แหล่งข้อมูลทั้งหมด | 9 |
| `laws` | กฎหมายหลัก 14 ฉบับ | 14 |
| `law_sections` | มาตราย่อยของกฎหมาย | 3,718 |
| `case_judgments` | คำพิพากษาศาลฎีกา | 1,258 |
| `case_law_links` | เชื่อมคำพิพากษากับมาตรา | (เชื่อมโยง) |
| `ingestion_log` | บันทึกการเพิ่มข้อมูล | หลายรายการ |

### Schema

```sql
-- sources: แหล่งข้อมูล
sources(source_id, source_name, source_type, source_url, description)

-- laws: กฎหมายหลัก
laws(law_id, law_name_th, law_name_en, year, krisdika_sysid, law_go_th_id, source_url, status, full_text, notes)

-- law_sections: มาตรา
law_sections(section_id, law_id, article_key, section_number, section_text, notes, is_cancelled, chapter)

-- case_judgments: คำพิพากษา
case_judgments(judgment_id, case_number, case_year, court, category, category_code, issue_number, law_references, fact, decision, source_id, source_url)
```

---

## รายการกฎหมายทั้ง 14 ฉบับ

### กฎหมายแรงงาน (เน้นหลัก)

| # | ชื่อกฎหมาย | ปี | law.go.th ID | มาตรา | แหล่งข้อมูล |
|---|-----------|-----|-------------|-------|------------|
| 1 | พ.ร.บ. คุ้มครองแรงงาน | 2541 | [8876](https://law.go.th/DetailLawPage?table_of_law_id=8876) | PyThaiNLP | law.go.th + PyThaiNLP |
| 4 | พ.ร.บ. ประกันสังคม | 2533 | [8832](https://law.go.th/DetailLawPage?table_of_law_id=8832) | 144 | law.go.th API |
| 5 | พ.ร.บ. เงินทดแทน | 2537 | [8622](https://law.go.th/DetailLawPage?table_of_law_id=8622) | PyThaiNLP | law.go.th + PyThaiNLP |
| 6 | พ.ร.บ. แรงงานสัมพันธ์ | 2518 | [8637](https://law.go.th/DetailLawPage?table_of_law_id=8637) | 164 | law.go.th API |
| 7 | พ.ร.บ. คุ้มครองผู้รับงานไปทำที่บ้าน | 2553 | [9413](https://law.go.th/DetailLawPage?table_of_law_id=9413) | PyThaiNLP | law.go.th + PyThaiNLP |
| 8 | พ.ร.บ. จัดหางานและคุ้มครองคนหางาน | 2528 | [9383](https://law.go.th/DetailLawPage?table_of_law_id=9383) | PyThaiNLP | law.go.th + PyThaiNLP |

### กฎหมายอื่นๆ

| # | ชื่อกฎหมาย | ปี | law.go.th ID | มาตรา | แหล่งข้อมูล |
|---|-----------|-----|-------------|-------|------------|
| 2 | ประมวลกฎหมายแพ่งและพาณิชย์ | 2468 | [9087](https://law.go.th/DetailLawPage?table_of_law_id=9087) | 1,911 | PyThaiNLP CSV |
| 3 | ประมวลกฎหมายอาญา | 2499 | [9186](https://law.go.th/DetailLawPage?table_of_law_id=9186) | 575 | PyThaiNLP CSV |
| 9 | ประมวลกฎหมายวิธีพิจารณาความแพ่ง | 2478 | [8465](https://law.go.th/DetailLawPage?table_of_law_id=8465) | 415 | law.go.th API |
| 10 | ประมวลกฎหมายที่ดิน | 2497 | [9057](https://law.go.th/DetailLawPage?table_of_law_id=9057) | 194 | law.go.th API |
| 11 | พ.ร.บ. ควบคุมการเช่าเคหะและที่ดิน | 2504 | [12070](https://law.go.th/DetailLawPage?table_of_law_id=12070) | 23 | law.go.th API |
| 12 | ประมวลกฎหมายวิธีพิจารณาความอาญา | 2478 | [9280](https://law.go.th/DetailLawPage?table_of_law_id=9280) | 292 | law.go.th API |
| 13 | พ.ร.บ. ยาเสพติดให้โทษ | 2522 | [12051](https://law.go.th/DetailLawPage?table_of_law_id=12051) | PyThaiNLP | law.go.th + PyThaiNLP |
| 14 | พ.ร.บ. จราจรทางบก | 2522 | [9364](https://law.go.th/DetailLawPage?table_of_law_id=9364) | PyThaiNLP | law.go.th + PyThaiNLP |

---

## ข้อมูลแรงงานทั้งหมด

### มาตราแรงงานในกฎหมายอื่นๆ

**ประมวลกฎหมายแพ่งและพาณิชย์** - 63 มาตราที่เกี่ยวข้อง:
- มาตรา 575-607: ลักษณะจ้างแรงงาน/จ้างทำของ
- มาตรา 425-426: นายจ้างรับผิดต่อลูกจ้าง
- มาตรา 257, 272: บุริมสิทธิ์ของลูกจ้าง
- มาตรา 193/34: อายุความคดีแรงงาน
- มาตรา 1028: หุ้นส่วนลงแรงงาน

**ประมวลกฎหมายอาญา** - 14 มาตราที่เกี่ยวข้อง:
- มาตรา 117: ยุยงให้หยุดงาน
- มาตรา 344: หลอกลวงไม่ใช้ค่าแรง
- มาตรา 84: จ้างวานกระทำความผิด

### ฎีกาแรงงาน 51 เรื่อง

| แหล่งข้อมูล | จำนวน | URL |
|-------------|--------|-----|
| ThaiDeka (deka.in.th) | 37 | https://deka.in.th/ |
| กระทรวงแรงงาน (ops.mol.go.th) | 14 | https://ops.mol.go.th/sentence |

**ตัวอย่างฎีกาแรงงาน:**
- คดีที่ 4047/2546 - การเลิกจ้างโดยไม่เป็นธรรม
- คดีที่ 1766/2544 - ค่าจ้างล่วงเวลา
- คดีที่ 2813/2544 - บุริมสิทธิ์ค่าจ้าง
- ศอ.142/2563 - ค่าชดเชยเลิกจ้าง

---

## แหล่งข้อมูล (Sources)

| ID | ชื่อแหล่งข้อมูล | URL |
|----|---------------|-----|
| 1 | สำนักงานคณะกรรมการกฤษฎีกา | krisdika.go.th |
| 2 | PyThaiNLP/thai-law (Hugging Face) | huggingface.co |
| 3 | PyThaiNLP/thai-law (GitHub) | github.com |
| 4 | TSCC Dataset | github.com |
| 5 | ระบบสืบค้นคำพิพากษาศาลฎีกา | supremecourt.or.th |
| 6 | กระทรวงแรงงาน - คำพิพากษาคดีแรงงาน | ops.mol.go.th |
| 7 | Open Law Data Thailand | github.com |
| 8 | WangchanX-Legal-ThaiCCL-RAG | github.com |
| 9 | ThaiDeka | deka.in.th |

---

## วิธีใช้งาน

### ค้นหามาตราแรงงานทั้งหมด

```sql
SELECT l.law_name_th, s.article_key, s.section_text
FROM law_sections s
JOIN laws l ON s.law_id = l.law_id
WHERE s.notes LIKE '%labor%'
ORDER BY l.law_id, s.section_id;
```

### ค้นหาฎีกาแรงงาน

```sql
SELECT case_number, case_year, fact, decision
FROM case_judgments
WHERE category = 'labor'
ORDER BY case_year DESC;
```

### ค้นหามาตราในกฎหมาย

```sql
SELECT s.article_key, s.section_text
FROM law_sections s
JOIN laws l ON s.law_id = l.law_id
WHERE l.law_name_th LIKE '%แรงงาน%';
```

---

## API ของ law.go.th

ใช้ API ภายในของเว็บไซต์ law.go.th ในการดึงเนื้อหากฎหมาย:

```
GET https://apig.law.go.th/dga-user-service-phase2/law/detail/{table_of_law_id}
Header: apikey: 4nEZYvTwRFlUVn7aK85cZ2xSU83dOFai
```

---

## หมายเหตุ

- กฎหมายที่มาจาก PyThaiNLP (law_id 1, 5, 7, 8, 13, 14) มีเนื้อหาเต็มใน `full_text` แต่ยังไม่ได้ parse เป็นมาตราแยกใน `law_sections`
- deka.supremecourt.or.th ไม่สามารถใช้ browser automation ได้ (CDP session errors) ใช้ deka.in.th แทน
- deka.in.th ต้องเข้าสู่ระบบเพื่อดูคำพิพากษาฉบับเต็ม
- ops.mol.go.th มีคำพิพากษาแรงงาน 4,326 หน้า แต่ดึงได้เพียงบางส่วน
- TSCC Dataset สำหรับการวิจัยเท่านั้น ไม่ใช้เชิงพาณิชย์

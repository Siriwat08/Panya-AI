"""Step 2: Insert cross_references using local JSON lookup."""
import sys, os, csv, json
sys.stdout = os.fdopen(sys.stdout.fileno(), 'w', buffering=1)

import libsql_experimental as libsql
TURSO_URL = "libsql://panya-ai-siriwat08.aws-ap-northeast-1.turso.io"
TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODUyMzI3MjcsImlkIjoiMDE5ZmEzNzQtYjAwMS03MWZiLWJiZjYtNjQ2YThkMzNmMWViIiwia2lkIjoiLWg1N1RSRmlJT0dMdldjYmpRSU9uVDJLU0tZWW4xZE1zYi1yMlk1TzVLMCIsInJpZCI6ImUxODZhMzBkLWIwY2ItNDhjYi04YWFlLTZhMGE2OWU1YmYxNCJ9.xDpHYWYoV2GyxUOjBDXndONUu059L0hMjCFEJDXNwzwB6xm0icUCRSIQTWyt_a8opI7Wo1OVj9n59NZwfmk_DA"

# Load lookups
with open('/tmp/code_lookup.json', 'r', encoding='utf-8') as f:
    lookup = json.load(f)
print(f"Loaded lookups: laws={len(lookup['law'])}, judgments={len(lookup['judgment'])}, regulations={len(lookup['regulation'])}, templates={len(lookup['contract_template'])}", flush=True)

conn = libsql.connect(TURSO_URL, auth_token=TURSO_TOKEN)
cur = conn.cursor()
print("Connected", flush=True)


def resolve_source(doc_id: str):
    if doc_id.startswith('F'):
        return ('contract_template', lookup['contract_template'].get(doc_id, 0))
    elif doc_id and doc_id[0] in 'ABCDE':
        return ('law', lookup['law'].get(doc_id, 0))
    elif doc_id.startswith('G'):
        return ('judgment', lookup['judgment'].get(doc_id, 0))
    elif doc_id.startswith('H'):
        return ('regulation', lookup['regulation'].get(doc_id, 0))
    return ('unknown', 0)


# Skip clear (table already empty)
print("Skipping clear (table already empty)", flush=True)

# Process CSV
csv_path = "/home/z/my-project/work/legal_data_v2/panya_ai_legal_data/cross_reference_map.csv"
rows_law = 0
rows_jud = 0
skipped = 0
errors = 0

print("Processing CSV...", flush=True)
with open(csv_path, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader):
        if i % 100 == 0:
            print(f"  row {i} (law:{rows_law} jud:{rows_jud} skip:{skipped})", flush=True)
        try:
            doc_id = row.get('DocID', '').strip()
            law_id_str = row.get('LawID', '').strip()
            section = row.get('Section', '').strip()
            relevance = row.get('Relevance', '').strip()
            judgment_ids = row.get('JudgmentIDs', '').strip()

            if not doc_id or not law_id_str:
                continue

            source_type, source_id = resolve_source(doc_id)
            if source_id == 0:
                skipped += 1
                continue

            target_law_id = lookup['law'].get(law_id_str, 0)

            cur.execute(
                "INSERT INTO cross_references (source_type, source_id, source_code, target_type, target_id, target_code, relation_type, section_ref, notes) VALUES (?, ?, ?, 'law', ?, ?, 'related_law', ?, ?)",
                (source_type, source_id, doc_id, target_law_id, law_id_str, section, relevance[:300])
            )
            rows_law += 1

            if judgment_ids:
                for jid in judgment_ids.split():
                    target_jud_id = lookup['judgment'].get(jid, 0)
                    cur.execute(
                        "INSERT INTO cross_references (source_type, source_id, source_code, target_type, target_id, target_code, relation_type, section_ref, notes) VALUES (?, ?, ?, 'judgment', ?, ?, 'cited_by', ?, ?)",
                        (source_type, source_id, doc_id, target_jud_id, jid, section, relevance[:200])
                    )
                    rows_jud += 1
        except Exception as e:
            errors += 1
            if errors < 5:
                print(f"  ERR row {i}: {e}", flush=True)

conn.commit()
print(f"\nInserted: {rows_law} law-section refs + {rows_jud} judgment refs ({skipped} skipped, {errors} errors)", flush=True)

cur.execute("SELECT COUNT(*) FROM cross_references")
print(f"Total cross_references: {cur.fetchone()[0]}", flush=True)

print("\nBy source_type:", flush=True)
cur.execute("SELECT source_type, COUNT(*) FROM cross_references GROUP BY source_type")
for r in cur.fetchall():
    print(f"  {r[0]:25s}: {r[1]}", flush=True)

print("\nBy relation_type:", flush=True)
cur.execute("SELECT relation_type, COUNT(*) FROM cross_references GROUP BY relation_type")
for r in cur.fetchall():
    print(f"  {r[0]:25s}: {r[1]}", flush=True)

conn.close()
print("\nDONE")

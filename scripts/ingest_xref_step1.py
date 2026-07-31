"""Step 1: Dump lookups to JSON file."""
import sys, os, json
sys.stdout = os.fdopen(sys.stdout.fileno(), 'w', buffering=1)

import libsql_experimental as libsql
TURSO_URL = "libsql://panya-ai-siriwat08.aws-ap-northeast-1.turso.io"
TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODUyMzI3MjcsImlkIjoiMDE5ZmEzNzQtYjAwMS03MWZiLWJiZjYtNjQ2YThkMzNmMWViIiwia2lkIjoiLWg1N1RSRmlJT0dMdldjYmpRSU9uVDJLU0tZWW4xZE1zYi1yMlk1TzVLMCIsInJpZCI6ImUxODZhMzBkLWIwY2ItNDhjYi04YWFlLTZhMGE2OWU1YmYxNCJ9.xDpHYWYoV2GyxUOjBDXndONUu059L0hMjCFEJDXNwzwB6xm0icUCRSIQTWyt_a8opI7Wo1OVj9n59NZwfmk_DA"

conn = libsql.connect(TURSO_URL, auth_token=TURSO_TOKEN)
cur = conn.cursor()

lookup = {}
print("Loading laws...", flush=True)
cur.execute("SELECT law_id, law_code FROM laws")
lookup['law'] = {r[1]: r[0] for r in cur.fetchall()}
print(f"  {len(lookup['law'])}", flush=True)

print("Loading judgments...", flush=True)
cur.execute("SELECT judgment_id, judgment_code FROM judgments")
lookup['judgment'] = {r[1]: r[0] for r in cur.fetchall()}
print(f"  {len(lookup['judgment'])}", flush=True)

print("Loading regulations...", flush=True)
cur.execute("SELECT regulation_id, regulation_code FROM regulations")
lookup['regulation'] = {r[1]: r[0] for r in cur.fetchall()}
print(f"  {len(lookup['regulation'])}", flush=True)

print("Loading templates...", flush=True)
cur.execute("SELECT template_id, template_code FROM contract_templates")
lookup['contract_template'] = {r[1]: r[0] for r in cur.fetchall()}
print(f"  {len(lookup['contract_template'])}", flush=True)

# Save JSON
out_path = '/tmp/code_lookup.json'
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(lookup, f, ensure_ascii=False, indent=2)
print(f"\nSaved to {out_path} ({os.path.getsize(out_path)} bytes)", flush=True)

conn.close()
print("DONE", flush=True)

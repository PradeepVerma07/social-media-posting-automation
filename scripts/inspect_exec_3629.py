import sqlite3, os, json, zlib

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT id, workflowId, status, startedAt, stoppedAt, data FROM execution_entity WHERE id = 3629")
row = cur.fetchone()
print("Execution 3629:", row[0], row[1], row[2], row[3], row[4])

data_str = row[5]
try:
    data = json.loads(data_str)
except Exception:
    try:
        data = json.loads(zlib.decompress(data_str))
    except Exception as e:
        data = None
        print("Could not decompress data:", e)

if data:
    result_data = data.get('resultData', {}).get('runData', {})
    print("Executed nodes in 3629:")
    for node_name, runs in result_data.items():
        print(f" - {node_name}: {len(runs)} run(s)")
        if 'error' in runs[0]:
            print(f"   ERROR in {node_name}:", runs[0]['error'])

conn.close()

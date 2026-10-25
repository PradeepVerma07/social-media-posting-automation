import sqlite3, os, json, zlib

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT executionId, data FROM execution_data WHERE executionId = 3629")
row = cur.fetchone()
if row:
    raw = row[1]
    try:
        data = json.loads(raw)
    except Exception:
        data = json.loads(zlib.decompress(raw))

    runData = data.get('resultData', {}).get('runData', {})
    print("Nodes run in execution 3629:")
    for k in runData.keys():
        print("  -", k)
        
    has_due = runData.get('Has Due Posts?')
    if has_due:
        print("Has Due Posts output:", has_due[0].get('data', {}).get('main'))
else:
    print("No execution_data found for 3629")

conn.close()

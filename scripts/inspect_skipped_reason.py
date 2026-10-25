import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT executionId, data FROM execution_data WHERE executionId = 3629")
row = cur.fetchone()
if row:
    raw = row[1]
    data = json.loads(raw)
    
    p152 = data[152]
    print("Post 152 in skippedPosts:")
    resolved = {}
    for k, v in p152.items():
        if isinstance(v, str) and v.isdigit() and int(v) < len(data):
            resolved[k] = data[int(v)]
        else:
            resolved[k] = v
    print("errorCode:", resolved.get('errorCode'))
    print("errorMessage:", resolved.get('errorMessage'))
    print("scheduled_utc:", resolved.get('scheduled_utc'))
    print("targetStatus:", resolved.get('targetStatus'))

conn.close()
